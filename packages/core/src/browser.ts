/** Browser-safe entry — no Node filesystem APIs. */
export type { Kind, Entity, EntityMeta, Ref, Relation, RelationType } from "./types.ts";
export { KINDS, RELATION_TYPES } from "./types.ts";
export {
  DEFAULT_NAMESPACE,
  formatRef,
  kindFromString,
  parseRef,
  refOf,
} from "./ref.ts";
export type { CatalogSnapshot } from "./snapshot.ts";
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
