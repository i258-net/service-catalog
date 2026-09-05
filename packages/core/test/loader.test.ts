import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCatalog, loadCatalogFromSources } from "../src/loader.ts";

async function catalogWith(yaml: string) {
  const dir = await mkdtemp(join(tmpdir(), "service-catalog-test-"));
  await writeFile(join(dir, "catalog.yaml"), yaml);
  return loadCatalog(dir);
}

test("reports a missing catalog directory helpfully", async () => {
  await assert.rejects(
    loadCatalog(join(tmpdir(), "service-catalog-does-not-exist")),
    /catalog directory .* not found \(set --catalog or \$SERVICE_CATALOG\)/,
  );
});

test("loads multi-document YAML files", async () => {
  const { entities, errors } = await catalogWith(`
apiVersion: backstage.io/v1alpha1
kind: Component
metadata: { name: a }
spec: { type: service, owner: team-a }
---
apiVersion: backstage.io/v1alpha1
kind: Group
metadata: { name: team-a }
spec: { type: team }
`);
  assert.deepEqual(errors, []);
  assert.deepEqual(entities.map((e) => e.metadata.name).sort(), ["a", "team-a"]);
});

test("rejects unsupported kinds, bad names, and missing required spec fields", async () => {
  const { entities, errors } = await catalogWith(`
apiVersion: backstage.io/v1alpha1
kind: Location
metadata: { name: elsewhere }
---
apiVersion: backstage.io/v1alpha1
kind: Component
metadata: { name: "not a name!" }
spec: { type: service, owner: x }
---
apiVersion: backstage.io/v1alpha1
kind: Component
metadata: { name: no-owner }
spec: { type: service }
`);
  assert.equal(entities.length, 0);
  assert.equal(errors.length, 3);
  assert.match(errors[0]!.message, /unsupported kind/);
  assert.match(errors[1]!.message, /invalid metadata.name/);
  assert.match(errors[2]!.message, /spec.owner is required/);
});

test("reports duplicate entities and keeps the first", async () => {
  const { entities, errors } = await catalogWith(`
apiVersion: backstage.io/v1alpha1
kind: Group
metadata: { name: twin }
spec: {}
---
apiVersion: backstage.io/v1alpha1
kind: Group
metadata: { name: twin }
spec: {}
`);
  assert.equal(entities.length, 1);
  assert.equal(errors.length, 1);
  assert.match(errors[0]!.message, /duplicate entity group:default\/twin/);
});

test("passes unknown spec inventory fields through untouched", () => {
  const { entities, errors } = loadCatalogFromSources([
    {
      sourceFile: "components/media/radarr.yaml",
      text: `
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: radarr
  title: Radarr
spec:
  type: service
  owner: user:daniel
  system: media
  upstream_repo: Radarr/Radarr
  advisory_source: github
  pin_source: none
  pinned_version: '5.28.0.10240-ls275'
  running_image: null
  verified_at: '2026-09-05T17:07:00Z'
  custom_future_field: keeps-riding
`,
    },
  ]);
  assert.deepEqual(errors, []);
  assert.equal(entities.length, 1);
  const spec = entities[0]!.spec;
  assert.equal(spec["upstream_repo"], "Radarr/Radarr");
  assert.equal(spec["advisory_source"], "github");
  assert.equal(spec["pin_source"], "none");
  assert.equal(spec["pinned_version"], "5.28.0.10240-ls275");
  assert.equal(spec["running_image"], null);
  assert.equal(spec["verified_at"], "2026-09-05T17:07:00Z");
  assert.equal(spec["custom_future_field"], "keeps-riding");
});
