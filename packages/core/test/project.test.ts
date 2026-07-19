import assert from "node:assert/strict";
import { test } from "node:test";
import { Graph } from "../src/graph.ts";
import { projectCatalog } from "../src/project.ts";
import { toCatalogSnapshot } from "../src/snapshot.ts";
import type { Entity, Kind } from "../src/types.ts";

function entity(kind: Kind, name: string, spec: Record<string, unknown> = {}): Entity {
  return {
    apiVersion: "backstage.io/v1alpha1",
    kind,
    metadata: { name, namespace: "default", tags: [] },
    spec,
    sourceFile: "test.yaml",
  };
}

test("snapshot includes entities and bidirectional relations", () => {
  const graph = Graph.build([
    entity("Group", "team-a"),
    entity("Component", "web", { owner: "team-a", type: "website" }),
  ]);
  const snap = toCatalogSnapshot(graph);
  assert.equal(snap.entities.length, 2);
  assert.ok(snap.relations.some((r) => r.type === "ownedBy"));
  assert.ok(snap.relations.some((r) => r.type === "ownerOf"));
});

test("projectCatalog returns upstream dependency chain", () => {
  const graph = Graph.build([
    entity("Group", "team-a"),
    entity("Component", "web", { owner: "team-a", type: "website", dependsOn: ["component:mid"] }),
    entity("Component", "mid", { owner: "team-a", type: "service", dependsOn: ["resource:db"] }),
    entity("Resource", "db", { owner: "team-a", type: "database" }),
  ]);
  const snap = toCatalogSnapshot(graph);
  const projection = projectCatalog(snap, {
    focus: "component:default/web",
    view: "upstream",
    depth: 2,
  });
  const refs = projection.nodes.map((n) => n.ref).sort();
  assert.deepEqual(refs, [
    "component:default/mid",
    "component:default/web",
    "resource:default/db",
  ]);
});

test("projectCatalog collapses large relation sets from focus", () => {
  const apis = Array.from({ length: 10 }, (_, i) =>
    entity("API", `api-${i}`, { owner: "team-a", type: "openapi" }),
  );
  const graph = Graph.build([
    entity("Group", "team-a"),
    entity("Component", "web", {
      owner: "team-a",
      type: "website",
      consumesApis: apis.map((a) => a.metadata.name),
    }),
    ...apis,
  ]);
  const snap = toCatalogSnapshot(graph);
  const collapsed = projectCatalog(snap, {
    focus: "component:default/web",
    view: "neighborhood",
    depth: 1,
    collapseThreshold: 8,
  });
  assert.ok(collapsed.nodes.some((n) => n.group?.type === "consumesApi"));

  const expanded = projectCatalog(snap, {
    focus: "component:default/web",
    view: "neighborhood",
    depth: 1,
    collapseThreshold: 8,
    expandedGroups: ["component:default/web|consumesApi"],
  });
  assert.equal(expanded.nodes.filter((n) => n.ref.startsWith("api:")).length, 10);
});
