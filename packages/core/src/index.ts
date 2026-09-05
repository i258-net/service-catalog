/** Full Node entry — includes filesystem catalog loading. */
export type { Kind, Entity, EntityMeta, Ref, Relation, RelationType } from "./types.ts";
export { KINDS, RELATION_TYPES } from "./types.ts";
export {
  DEFAULT_NAMESPACE,
  formatRef,
  kindFromString,
  parseRef,
  refOf,
} from "./ref.ts";
export { Graph } from "./graph.ts";
export {
  loadCatalog,
  loadCatalogFromSources,
  type CatalogError,
  type CatalogSource,
  type LoadResult,
} from "./loader.ts";
export {
  MERMAID_RELATION_TYPES,
  toMermaid,
  nodeId,
  type MermaidDirection,
  type MermaidOptions,
} from "./mermaid.ts";
export { toCatalogSnapshot, type CatalogSnapshot } from "./snapshot.ts";
export {
  compactName,
  searchableText,
  tokenizeName,
} from "./searchNormalize.ts";
export {
  DOWNSTREAM_TYPES,
  UPSTREAM_TYPES,
  projectCatalog,
  type GraphView,
  type ProjectOptions,
  type ProjectedEdge,
  type ProjectedNode,
  type Projection,
} from "./project.ts";
