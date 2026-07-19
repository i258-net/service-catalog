import { Graph } from "./graph.ts";
import { refOf } from "./ref.ts";
import type { Ref, RelationType } from "./types.ts";

/** Relation directions that originate from entity spec fields (not inverses). */
export const MERMAID_RELATION_TYPES = [
  "ownedBy",
  "dependsOn",
  "partOf",
  "providesApi",
  "consumesApi",
  "childOf",
  "memberOf",
] as const satisfies readonly RelationType[];

export type MermaidDirection = "TB" | "LR";

export interface MermaidOptions {
  /** Subset of forward relation types to draw. Defaults to all of them. */
  types?: readonly RelationType[];
  /** Flowchart direction. Defaults to LR. */
  direction?: MermaidDirection;
}

/**
 * Render a catalog graph as a Mermaid flowchart.
 * Only forward relations are emitted so inverse pairs do not double every edge.
 */
export function toMermaid(graph: Graph, options: MermaidOptions = {}): string {
  const direction = options.direction ?? "LR";
  const types = new Set<RelationType>(options.types ?? MERMAID_RELATION_TYPES);

  const lines: string[] = [`flowchart ${direction}`];
  const declared = new Set<string>();

  const ensureNode = (ref: Ref): string => {
    const id = nodeId(ref);
    if (declared.has(id)) return id;
    declared.add(id);
    const entity = graph.get(ref);
    const label = entity
      ? `${entity.metadata.title ?? entity.metadata.name}<br/>${entity.kind}`
      : `${ref}<br/>(missing)`;
    lines.push(`  ${id}["${escapeLabel(label)}"]`);
    return id;
  };

  const entityRefs = [...graph.entities.keys()].sort();
  for (const ref of entityRefs) ensureNode(ref);

  const edges: string[] = [];
  for (const ref of entityRefs) {
    for (const relation of graph.relationsOf(ref)) {
      if (!types.has(relation.type)) continue;
      const from = ensureNode(relation.source);
      const to = ensureNode(relation.target);
      edges.push(`  ${from} -->|${relation.type}| ${to}`);
    }
  }
  edges.sort();
  lines.push(...edges);

  return `${lines.join("\n")}\n`;
}

/** Mermaid node ids must be alphanumeric/underscore. */
export function nodeId(ref: Ref): string {
  return ref.replace(/[^a-zA-Z0-9_]/g, "_");
}

function escapeLabel(text: string): string {
  return text.replace(/"/g, "'").replace(/\n/g, " ");
}
