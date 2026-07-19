/** The subset of the Backstage entity format that Bones understands. */

export const KINDS = [
  "Component",
  "API",
  "System",
  "Domain",
  "Resource",
  "Group",
  "User",
] as const;

export type Kind = (typeof KINDS)[number];

export interface EntityMeta {
  name: string;
  namespace: string;
  title?: string;
  description?: string;
  tags: string[];
}

export interface Entity {
  apiVersion: string;
  kind: Kind;
  metadata: EntityMeta;
  /** Kind-specific fields (owner, type, lifecycle, dependsOn, ...). */
  spec: Record<string, unknown>;
  /** Catalog-relative path of the YAML file this entity came from. */
  sourceFile: string;
}

/** A fully-qualified entity reference, e.g. "component:default/orders". */
export type Ref = string;

export const RELATION_TYPES = [
  "ownedBy",
  "ownerOf",
  "dependsOn",
  "dependencyOf",
  "partOf",
  "hasPart",
  "providesApi",
  "apiProvidedBy",
  "consumesApi",
  "apiConsumedBy",
  "childOf",
  "parentOf",
  "memberOf",
  "hasMember",
] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

export interface Relation {
  type: RelationType;
  source: Ref;
  target: Ref;
}
