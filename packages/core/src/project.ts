import type { CatalogSnapshot } from "./snapshot.ts";
import type { Entity, Ref, Relation, RelationType } from "./types.ts";
import { refOf } from "./ref.ts";

export type GraphView = "neighborhood" | "upstream" | "downstream";

export const UPSTREAM_TYPES = ["dependsOn", "consumesApi"] as const satisfies readonly RelationType[];
export const DOWNSTREAM_TYPES = ["dependencyOf", "apiConsumedBy"] as const satisfies readonly RelationType[];

export interface ProjectOptions {
  focus: Ref;
  view: GraphView;
  depth: number;
  /** Relation types whose stubs are expanded (not collapsed). */
  expandedGroups?: readonly string[];
  /** Collapse relation fan-out beyond this size. Default 8. */
  collapseThreshold?: number;
}

export interface ProjectedNode {
  ref: Ref;
  kind: string;
  label: string;
  missing: boolean;
  isFocus: boolean;
  /** Present when this node stands in for a collapsed relation group. */
  group?: {
    id: string;
    type: RelationType;
    source: Ref;
    hiddenRefs: Ref[];
  };
}

export interface ProjectedEdge {
  id: string;
  source: Ref;
  target: Ref;
  type: RelationType;
}

export interface Projection {
  nodes: ProjectedNode[];
  edges: ProjectedEdge[];
}

/** Build a local subgraph projection from a catalog snapshot. */
export function projectCatalog(
  snapshot: CatalogSnapshot,
  options: ProjectOptions,
): Projection {
  const threshold = options.collapseThreshold ?? 8;
  const expanded = new Set(options.expandedGroups ?? []);
  const entityByRef = new Map<Ref, Entity>();
  for (const entity of snapshot.entities) {
    entityByRef.set(refOf(entity), entity);
  }

  const outgoing = new Map<Ref, Relation[]>();
  for (const relation of snapshot.relations) {
    let list = outgoing.get(relation.source);
    if (!list) {
      list = [];
      outgoing.set(relation.source, list);
    }
    list.push(relation);
  }

  const allowedTypes: ReadonlySet<RelationType> | null =
    options.view === "upstream"
      ? new Set(UPSTREAM_TYPES)
      : options.view === "downstream"
        ? new Set(DOWNSTREAM_TYPES)
        : null;

  const nodeMap = new Map<Ref, ProjectedNode>();
  const edges: ProjectedEdge[] = [];
  const edgeKeys = new Set<string>();

  const ensureEntityNode = (ref: Ref, isFocus = false): void => {
    if (nodeMap.has(ref)) {
      if (isFocus) {
        const existing = nodeMap.get(ref)!;
        nodeMap.set(ref, { ...existing, isFocus: true });
      }
      return;
    }
    const entity = entityByRef.get(ref);
    nodeMap.set(ref, {
      ref,
      kind: entity?.kind ?? ref.split(":")[0] ?? "unknown",
      label: entity?.metadata.title ?? entity?.metadata.name ?? ref,
      missing: !entity,
      isFocus,
    });
  };

  ensureEntityNode(options.focus, true);

  const visited = new Set<Ref>([options.focus]);
  let frontier = [options.focus];

  for (let depth = 1; depth <= options.depth && frontier.length > 0; depth++) {
    const next: Ref[] = [];
    for (const source of frontier) {
      const relations = (outgoing.get(source) ?? [])
        .filter((r) => (allowedTypes ? allowedTypes.has(r.type) : true))
        .sort((a, b) => {
          const byType = a.type.localeCompare(b.type);
          if (byType !== 0) return byType;
          return a.target.localeCompare(b.target);
        });

      const byType = new Map<RelationType, Relation[]>();
      for (const relation of relations) {
        let list = byType.get(relation.type);
        if (!list) {
          list = [];
          byType.set(relation.type, list);
        }
        list.push(relation);
      }

      for (const [type, group] of [...byType.entries()].sort((a, b) =>
        a[0].localeCompare(b[0]),
      )) {
        const groupId = `${source}|${type}`;
        const shouldCollapse =
          depth === 1 &&
          source === options.focus &&
          group.length > threshold &&
          !expanded.has(groupId);

        if (shouldCollapse) {
          const hiddenRefs = group.map((r) => r.target).sort();
          const stubRef = `group:${groupId}`;
          nodeMap.set(stubRef, {
            ref: stubRef,
            kind: "GroupStub",
            label: `+${group.length} ${type}`,
            missing: false,
            isFocus: false,
            group: { id: groupId, type, source, hiddenRefs },
          });
          addEdge(edges, edgeKeys, source, stubRef, type);
          continue;
        }

        for (const relation of group) {
          ensureEntityNode(relation.target);
          addEdge(edges, edgeKeys, relation.source, relation.target, relation.type);
          if (!visited.has(relation.target)) {
            visited.add(relation.target);
            next.push(relation.target);
          }
        }
      }
    }
    frontier = next.sort();
  }

  const nodes = [...nodeMap.values()].sort((a, b) => a.ref.localeCompare(b.ref));
  edges.sort((a, b) => a.id.localeCompare(b.id));
  return { nodes, edges };
}

function addEdge(
  edges: ProjectedEdge[],
  edgeKeys: Set<string>,
  source: Ref,
  target: Ref,
  type: RelationType,
): void {
  const id = `${type}:${source}->${target}`;
  if (edgeKeys.has(id)) return;
  edgeKeys.add(id);
  edges.push({ id, source, target, type });
}
