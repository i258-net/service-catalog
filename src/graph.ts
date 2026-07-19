import { parseRef, refOf } from "./ref.ts";
import type { Entity, Kind, Ref, Relation, RelationType } from "./types.ts";

const INVERSE: Record<RelationType, RelationType> = {
  ownedBy: "ownerOf",
  ownerOf: "ownedBy",
  dependsOn: "dependencyOf",
  dependencyOf: "dependsOn",
  partOf: "hasPart",
  hasPart: "partOf",
  providesApi: "apiProvidedBy",
  apiProvidedBy: "providesApi",
  consumesApi: "apiConsumedBy",
  apiConsumedBy: "consumesApi",
  childOf: "parentOf",
  parentOf: "childOf",
  memberOf: "hasMember",
  hasMember: "memberOf",
};

/** spec fields that produce relations: field -> [relation, default target kind, which kinds have it] */
const SPEC_RELATIONS: Array<{
  field: string;
  type: RelationType;
  targetKind: Kind;
  kinds: Kind[];
}> = [
  { field: "owner", type: "ownedBy", targetKind: "Group", kinds: ["Component", "API", "System", "Domain", "Resource"] },
  { field: "dependsOn", type: "dependsOn", targetKind: "Component", kinds: ["Component", "API", "Resource"] },
  { field: "providesApis", type: "providesApi", targetKind: "API", kinds: ["Component"] },
  { field: "consumesApis", type: "consumesApi", targetKind: "API", kinds: ["Component"] },
  { field: "system", type: "partOf", targetKind: "System", kinds: ["Component", "API", "Resource"] },
  { field: "subcomponentOf", type: "partOf", targetKind: "Component", kinds: ["Component"] },
  { field: "domain", type: "partOf", targetKind: "Domain", kinds: ["System"] },
  { field: "parent", type: "childOf", targetKind: "Group", kinds: ["Group"] },
  { field: "memberOf", type: "memberOf", targetKind: "Group", kinds: ["User"] },
];

export class Graph {
  readonly entities = new Map<Ref, Entity>();
  /** Outgoing relations per entity, including inverses. */
  private readonly relations = new Map<Ref, Relation[]>();
  /** Relation targets that do not resolve to a loaded entity. */
  readonly danglingRefs: Relation[] = [];

  static build(entities: Entity[]): Graph {
    const graph = new Graph();
    for (const entity of entities) {
      graph.entities.set(refOf(entity), entity);
    }
    for (const entity of entities) {
      const source = refOf(entity);
      for (const { field, type, targetKind, kinds } of SPEC_RELATIONS) {
        if (!kinds.includes(entity.kind)) continue;
        const value = entity.spec[field];
        const targets = Array.isArray(value) ? value : value !== undefined ? [value] : [];
        for (const raw of targets) {
          if (typeof raw !== "string") continue;
          graph.addRelation({ type, source, target: parseRef(raw, targetKind) });
        }
      }
    }
    return graph;
  }

  private addRelation(relation: Relation): void {
    this.push(relation);
    this.push({
      type: INVERSE[relation.type],
      source: relation.target,
      target: relation.source,
    });
    if (!this.entities.has(relation.target)) {
      this.danglingRefs.push(relation);
    }
  }

  private push(relation: Relation): void {
    let list = this.relations.get(relation.source);
    if (!list) {
      list = [];
      this.relations.set(relation.source, list);
    }
    list.push(relation);
  }

  get(ref: Ref): Entity | undefined {
    return this.entities.get(ref);
  }

  relationsOf(ref: Ref, type?: RelationType): Relation[] {
    const all = this.relations.get(ref) ?? [];
    return type ? all.filter((r) => r.type === type) : all;
  }

  /**
   * Breadth-first traversal from `start`, following relations of the given
   * type. Returns reached refs with their depth, excluding the start itself.
   */
  traverse(start: Ref, type: RelationType, maxDepth = Infinity): Array<{ ref: Ref; depth: number }> {
    const visited = new Set<Ref>([start]);
    const out: Array<{ ref: Ref; depth: number }> = [];
    let frontier = [start];
    for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth++) {
      const next: Ref[] = [];
      for (const ref of frontier) {
        for (const relation of this.relationsOf(ref, type)) {
          if (visited.has(relation.target)) continue;
          visited.add(relation.target);
          out.push({ ref: relation.target, depth });
          next.push(relation.target);
        }
      }
      frontier = next;
    }
    return out;
  }
}
