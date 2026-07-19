import assert from "node:assert/strict";
import { test } from "node:test";
import { Graph } from "../src/graph.ts";
import { nodeId, toMermaid } from "../src/mermaid.ts";
import type { Entity, Kind } from "../src/types.ts";

function entity(kind: Kind, name: string, spec: Record<string, unknown> = {}): Entity {
  return {
    apiVersion: "backstage.io/v1alpha1",
    kind,
    metadata: { name, namespace: "default", tags: [], title: name === "web" ? "Web App" : undefined },
    spec,
    sourceFile: "test.yaml",
  };
}

const graph = Graph.build([
  entity("Group", "team-a"),
  entity("Component", "web", { owner: "team-a", dependsOn: ["component:mid"] }),
  entity("Component", "mid", { owner: "team-a", dependsOn: ["resource:db"] }),
  entity("Resource", "db", { owner: "team-a", type: "database" }),
]);

test("nodeId sanitizes entity refs for Mermaid", () => {
  assert.equal(nodeId("component:default/orders"), "component_default_orders");
});

test("exports a deterministic Mermaid flowchart of forward relations", () => {
  assert.equal(
    toMermaid(graph),
    `flowchart LR
  component_default_mid["mid<br/>Component"]
  component_default_web["Web App<br/>Component"]
  group_default_team_a["team-a<br/>Group"]
  resource_default_db["db<br/>Resource"]
  component_default_mid -->|dependsOn| resource_default_db
  component_default_mid -->|ownedBy| group_default_team_a
  component_default_web -->|dependsOn| component_default_mid
  component_default_web -->|ownedBy| group_default_team_a
  resource_default_db -->|ownedBy| group_default_team_a
`,
  );
});

test("filters by relation type and flowchart direction", () => {
  assert.equal(
    toMermaid(graph, { types: ["dependsOn"], direction: "TB" }),
    `flowchart TB
  component_default_mid["mid<br/>Component"]
  component_default_web["Web App<br/>Component"]
  group_default_team_a["team-a<br/>Group"]
  resource_default_db["db<br/>Resource"]
  component_default_mid -->|dependsOn| resource_default_db
  component_default_web -->|dependsOn| component_default_mid
`,
  );
});

test("includes dangling targets as missing nodes", () => {
  const lonely = Graph.build([
    entity("Component", "a", { owner: "ghosts", dependsOn: ["component:missing"] }),
  ]);
  const out = toMermaid(lonely, { types: ["dependsOn", "ownedBy"] });
  assert.match(out, /component_default_missing\["component:default\/missing<br\/>\(missing\)"\]/);
  assert.match(out, /group_default_ghosts\["group:default\/ghosts<br\/>\(missing\)"\]/);
  assert.match(out, /component_default_a -->|dependsOn| component_default_missing/);
  assert.match(out, /component_default_a -->|ownedBy| group_default_ghosts/);
});
