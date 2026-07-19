import type { CatalogError } from "./loader.ts";
import { Graph } from "./graph.ts";
import { refOf } from "./ref.ts";
import type { Entity, Relation } from "./types.ts";

export interface CatalogSnapshot {
  entities: Entity[];
  relations: Relation[];
  errors: CatalogError[];
  danglingRefs: Relation[];
}

/** Serialize a graph into a JSON-friendly snapshot for the web UI or export. */
export function toCatalogSnapshot(
  graph: Graph,
  errors: CatalogError[] = [],
): CatalogSnapshot {
  const entities = [...graph.entities.values()].sort((a, b) =>
    refOf(a).localeCompare(refOf(b)),
  );
  const relationKeys = new Set<string>();
  const relations: Relation[] = [];

  const pushAll = (ref: string): void => {
    for (const relation of graph.relationsOf(ref)) {
      const key = `${relation.type}\0${relation.source}\0${relation.target}`;
      if (relationKeys.has(key)) continue;
      relationKeys.add(key);
      relations.push(relation);
    }
  };

  for (const ref of [...graph.entities.keys()].sort()) pushAll(ref);
  for (const dangling of graph.danglingRefs) pushAll(dangling.target);

  relations.sort((a, b) => {
    const byType = a.type.localeCompare(b.type);
    if (byType !== 0) return byType;
    const bySource = a.source.localeCompare(b.source);
    if (bySource !== 0) return bySource;
    return a.target.localeCompare(b.target);
  });

  return {
    entities,
    relations,
    errors: [...errors],
    danglingRefs: [...graph.danglingRefs],
  };
}
