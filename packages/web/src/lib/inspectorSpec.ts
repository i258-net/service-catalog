/** Spec keys already shown as identity or via the Relations list. */
export const STRUCTURAL_SPEC_KEYS = new Set([
  "type",
  "lifecycle",
  "owner",
  "dependsOn",
  "providesApis",
  "consumesApis",
  "system",
  "subcomponentOf",
  "domain",
  "parent",
  "memberOf",
]);

/** Inventory / advisory fields from catalog COMPONENT_FIELDS.md. */
export const INVENTORY_SPEC_KEYS = [
  "pinned_version",
  "running_image",
  "verified_at",
  "upstream_repo",
  "advisory_source",
  "pin_source",
] as const;

export type InventorySpecKey = (typeof INVENTORY_SPEC_KEYS)[number];

const INVENTORY_KEY_SET = new Set<string>(INVENTORY_SPEC_KEYS);

export function hasInventoryFields(spec: Record<string, unknown>): boolean {
  return INVENTORY_SPEC_KEYS.some((key) => key in spec);
}

/** True when the row participates in inventory and this pass left verified_at unset. */
export function isUnverified(spec: Record<string, unknown>): boolean {
  return "verified_at" in spec && spec.verified_at === null;
}

export function remainingSpecKeys(spec: Record<string, unknown>): string[] {
  return Object.keys(spec)
    .filter((key) => !STRUCTURAL_SPEC_KEYS.has(key) && !INVENTORY_KEY_SET.has(key))
    .sort();
}

export function formatSpecScalar(value: unknown): {
  text: string;
  title?: string;
  isNull: boolean;
} {
  if (value === null) {
    return { text: "null", isNull: true };
  }
  if (typeof value === "string") {
    if (value === "none") {
      return { text: "none", isNull: false };
    }
    const digest = value.match(/^(.*)@sha256:([0-9a-f]{64})$/i);
    if (digest) {
      return {
        text: `${digest[1]}@sha256:${digest[2]!.slice(0, 12)}…`,
        title: value,
        isNull: false,
      };
    }
    return {
      text: value,
      title: value.length > 64 ? value : undefined,
      isNull: false,
    };
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return { text: String(value), isNull: false };
  }
  return {
    text: JSON.stringify(value, null, 2),
    isNull: false,
  };
}
