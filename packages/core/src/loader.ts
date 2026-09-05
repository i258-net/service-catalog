import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseAllDocuments } from "yaml";
import { kindFromString, refOf, DEFAULT_NAMESPACE } from "./ref.ts";
import type { Entity } from "./types.ts";

export interface LoadResult {
  entities: Entity[];
  errors: CatalogError[];
}

export interface CatalogError {
  file: string;
  message: string;
}

/** One YAML file's text, ready to parse without touching the filesystem. */
export interface CatalogSource {
  /** Catalog-relative path used in errors and Entity.sourceFile. */
  sourceFile: string;
  text: string;
}

/** Backstage rules: alphanumeric words joined by [-_.], max 63 chars. */
const NAME_RE = /^[a-z0-9A-Z]+([-_.][a-z0-9A-Z]+)*$/;

const REF_LIST_FIELDS: Record<string, string[]> = {
  component: ["dependsOn", "providesApis", "consumesApis"],
  api: ["dependsOn"],
  resource: ["dependsOn"],
  group: [],
  user: ["memberOf"],
  system: [],
  domain: [],
};

/**
 * Parse catalog entities from in-memory YAML sources (GitHub fetch, tests).
 * Unknown `spec` keys are kept as-is — callers must not whitelist inventory
 * fields in application code.
 */
export function loadCatalogFromSources(sources: CatalogSource[]): LoadResult {
  const entities: Entity[] = [];
  const errors: CatalogError[] = [];

  for (const { sourceFile, text } of sources) {
    for (const doc of parseAllDocuments(text)) {
      if (doc.errors.length > 0) {
        errors.push({ file: sourceFile, message: doc.errors[0]!.message });
        continue;
      }
      const raw = doc.toJS();
      if (raw == null) continue; // empty document
      const result = toEntity(raw, sourceFile);
      if (typeof result === "string") {
        errors.push({ file: sourceFile, message: result });
      } else {
        entities.push(result);
      }
    }
  }

  return dedupeEntities(entities, errors);
}

export async function loadCatalog(dir: string): Promise<LoadResult> {
  const sources: CatalogSource[] = [];
  for (const file of await findYamlFiles(dir)) {
    sources.push({
      sourceFile: relative(dir, file),
      text: await readFile(file, "utf8"),
    });
  }
  return loadCatalogFromSources(sources);
}

function dedupeEntities(
  entities: Entity[],
  errors: CatalogError[],
): LoadResult {
  // Duplicate refs are a catalog error; keep the first occurrence.
  const seen = new Map<string, Entity>();
  const unique: Entity[] = [];
  for (const entity of entities) {
    const ref = refOf(entity);
    const existing = seen.get(ref);
    if (existing) {
      errors.push({
        file: entity.sourceFile,
        message: `duplicate entity ${ref} (already defined in ${existing.sourceFile})`,
      });
    } else {
      seen.set(ref, entity);
      unique.push(entity);
    }
  }

  return { entities: unique, errors };
}

async function findYamlFiles(dir: string): Promise<string[]> {
  let dirents;
  try {
    dirents = await readdir(dir, { withFileTypes: true, recursive: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `catalog directory "${dir}" not found (set --catalog or $SERVICE_CATALOG)`,
      );
    }
    throw err;
  }
  return dirents
    .filter((d) => d.isFile() && /\.ya?ml$/.test(d.name) && !d.name.startsWith("."))
    .map((d) => join(d.parentPath, d.name))
    .sort();
}

/** Validate one YAML document; returns an Entity or an error message. */
function toEntity(raw: unknown, sourceFile: string): Entity | string {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return "document is not a mapping";
  }
  const obj = raw as Record<string, unknown>;

  const apiVersion = obj["apiVersion"];
  if (typeof apiVersion !== "string" || !/^backstage\.io\/v1(alpha|beta)\d+$/.test(apiVersion)) {
    return `unsupported apiVersion ${JSON.stringify(apiVersion ?? null)} (expected backstage.io/v1alpha1)`;
  }

  const kind = typeof obj["kind"] === "string" ? kindFromString(obj["kind"]) : undefined;
  if (!kind) {
    return `unsupported kind ${JSON.stringify(obj["kind"] ?? null)}`;
  }

  const metadata = obj["metadata"];
  if (typeof metadata !== "object" || metadata === null) {
    return "missing metadata";
  }
  const meta = metadata as Record<string, unknown>;
  const name = meta["name"];
  if (typeof name !== "string" || name.length > 63 || !NAME_RE.test(name)) {
    return `invalid metadata.name ${JSON.stringify(name ?? null)}`;
  }
  const namespace = meta["namespace"] ?? DEFAULT_NAMESPACE;
  if (typeof namespace !== "string" || !NAME_RE.test(namespace)) {
    return `invalid metadata.namespace ${JSON.stringify(namespace)}`;
  }

  const spec = obj["spec"] ?? {};
  if (typeof spec !== "object" || spec === null || Array.isArray(spec)) {
    return "spec is not a mapping";
  }
  const specObj = spec as Record<string, unknown>;

  const specError = validateSpec(kind, specObj);
  if (specError) return `${kind.toLowerCase()}:${namespace}/${name}: ${specError}`;

  return {
    apiVersion,
    kind,
    metadata: {
      name,
      namespace: namespace.toLowerCase(),
      ...(typeof meta["title"] === "string" ? { title: meta["title"] } : {}),
      ...(typeof meta["description"] === "string"
        ? { description: meta["description"] }
        : {}),
      tags: Array.isArray(meta["tags"]) ? meta["tags"].filter((t) => typeof t === "string") : [],
    },
    // Full mapping — inventory / advisory fields ride through without a whitelist.
    spec: specObj,
    sourceFile,
  };
}

function validateSpec(kind: Entity["kind"], spec: Record<string, unknown>): string | undefined {
  const lower = kind.toLowerCase();

  const needsOwner = ["component", "api", "system", "domain", "resource"].includes(lower);
  if (needsOwner && typeof spec["owner"] !== "string") {
    return "spec.owner is required and must be a string";
  }
  if (["component", "api", "resource"].includes(lower) && typeof spec["type"] !== "string") {
    return "spec.type is required and must be a string";
  }
  for (const field of ["system", "subcomponentOf", "domain", "parent"]) {
    if (field in spec && typeof spec[field] !== "string") {
      return `spec.${field} must be a string entity reference`;
    }
  }
  for (const field of REF_LIST_FIELDS[lower] ?? []) {
    const value = spec[field];
    if (value === undefined) continue;
    if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
      return `spec.${field} must be a list of entity references`;
    }
  }
  return undefined;
}
