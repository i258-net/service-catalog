import assert from "node:assert/strict";
import { test } from "node:test";
import { Graph } from "../src/graph.ts";
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

const graph = Graph.build([
  entity("Group", "team-a"),
  entity("Component", "web", { owner: "team-a", dependsOn: ["component:mid"] }),
  entity("Component", "mid", { owner: "team-a", dependsOn: ["resource:db"] }),
  entity("Resource", "db", { owner: "team-a", type: "database" }),
]);

test("builds relations with inverses", () => {
  assert.deepEqual(graph.relationsOf("component:default/web", "ownedBy"), [
    { type: "ownedBy", source: "component:default/web", target: "group:default/team-a" },
  ]);
  const owned = graph.relationsOf("group:default/team-a", "ownerOf").map((r) => r.target);
  assert.deepEqual(owned.sort(), [
    "component:default/mid",
    "component:default/web",
    "resource:default/db",
  ]);
});

test("traverses transitive dependencies breadth-first", () => {
  assert.deepEqual(graph.traverse("component:default/web", "dependsOn"), [
    { ref: "component:default/mid", depth: 1 },
    { ref: "resource:default/db", depth: 2 },
  ]);
  assert.deepEqual(graph.traverse("component:default/web", "dependsOn", 1), [
    { ref: "component:default/mid", depth: 1 },
  ]);
  assert.deepEqual(graph.traverse("resource:default/db", "dependencyOf", 99), [
    { ref: "component:default/mid", depth: 1 },
    { ref: "component:default/web", depth: 2 },
  ]);
});

test("survives dependency cycles", () => {
  const cyclic = Graph.build([
    entity("Component", "a", { owner: "g", dependsOn: ["component:b"] }),
    entity("Component", "b", { owner: "g", dependsOn: ["component:a"] }),
  ]);
  assert.deepEqual(cyclic.traverse("component:default/a", "dependsOn"), [
    { ref: "component:default/b", depth: 1 },
  ]);
});

test("records dangling references", () => {
  const lonely = Graph.build([
    entity("Component", "a", { owner: "ghosts", dependsOn: ["component:missing"] }),
  ]);
  assert.deepEqual(
    lonely.danglingRefs.map((r) => r.target).sort(),
    ["component:default/missing", "group:default/ghosts"],
  );
});
