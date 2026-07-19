/** Split identifiers into searchable tokens (camelCase, kebab, snake, spaces). */
export function tokenizeName(value: string): string[] {
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2");
  return spaced
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Compact alphanumeric fingerprint used for cross-separator matching. */
export function compactName(value: string): string {
  return tokenizeName(value).join("");
}

/** Build the searchable text blob for an entity field. */
export function searchableText(...parts: Array<string | undefined | null>): string {
  const tokens = new Set<string>();
  const compact = new Set<string>();
  for (const part of parts) {
    if (!part) continue;
    for (const token of tokenizeName(part)) tokens.add(token);
    const c = compactName(part);
    if (c) compact.add(c);
  }
  return [...tokens, ...compact].join(" ");
}
