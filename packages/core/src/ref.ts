import { KINDS, type Entity, type Kind, type Ref } from "./types.ts";

export const DEFAULT_NAMESPACE = "default";

const KIND_BY_LOWER: ReadonlyMap<string, Kind> = new Map(
  KINDS.map((k) => [k.toLowerCase(), k]),
);

export function kindFromString(value: string): Kind | undefined {
  return KIND_BY_LOWER.get(value.toLowerCase());
}

export function refOf(entity: Entity): Ref {
  return formatRef(entity.kind, entity.metadata.namespace, entity.metadata.name);
}

export function formatRef(kind: string, namespace: string, name: string): Ref {
  return `${kind.toLowerCase()}:${namespace.toLowerCase()}/${name.toLowerCase()}`;
}

/**
 * Parse a possibly-partial entity reference like "orders",
 * "component:orders", "default/orders" or "component:default/orders".
 * Missing parts fall back to the given defaults.
 */
export function parseRef(input: string, defaultKind?: Kind): Ref {
  let rest = input.trim();
  let kind = defaultKind?.toLowerCase();
  let namespace = DEFAULT_NAMESPACE;

  const colon = rest.indexOf(":");
  if (colon >= 0) {
    kind = rest.slice(0, colon);
    rest = rest.slice(colon + 1);
  }
  const slash = rest.indexOf("/");
  if (slash >= 0) {
    namespace = rest.slice(0, slash);
    rest = rest.slice(slash + 1);
  }
  if (!kind) {
    throw new Error(
      `Entity reference "${input}" has no kind; use the form kind:namespace/name`,
    );
  }
  if (!rest) {
    throw new Error(`Entity reference "${input}" has no name`);
  }
  return formatRef(kind, namespace, rest);
}
