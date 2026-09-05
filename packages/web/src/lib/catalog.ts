import "server-only";
import {
  Graph,
  loadCatalog,
  toCatalogSnapshot,
  type CatalogSnapshot,
  type Entity,
  type Kind,
} from "@service-catalog/core";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalogFromGithub } from "./githubCatalog";
import { githubCatalogConfig } from "./githubCatalogConfig";
import { errorMessage } from "./lastGoodCache";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

const KIND_BUCKETS = [
  "Component",
  "System",
  "Domain",
  "API",
  "Resource",
  "Group",
  "User",
] as const satisfies readonly Kind[];

export type CatalogDocument = {
  generated_at: string;
  catalog_sha: string;
  source: "github" | "disk";
  components: Entity[];
  systems: Entity[];
  domains: Entity[];
  apis: Entity[];
  resources: Entity[];
  groups: Entity[];
  users: Entity[];
  relations: CatalogSnapshot["relations"];
  errors: CatalogSnapshot["errors"];
  danglingRefs: CatalogSnapshot["danglingRefs"];
};

type DiskCache = { dir: string; sha: string | null; snapshot: CatalogSnapshot };
let diskCached: DiskCache | undefined;

export function catalogDir(): string {
  const dir = process.env.SERVICE_CATALOG;
  if (dir) return fs.realpathSync(dir);
  if (process.env.NODE_ENV === "production") {
    throw new Error("SERVICE_CATALOG is required in production");
  }
  return path.resolve(moduleDir, "../../../../sample-catalog");
}

/** Resolve the commit the on-disk catalog was checked out at (git-sync or plain clone). */
export function catalogShaFromDir(dir: string): string | null {
  let real: string;
  try {
    real = fs.realpathSync(dir);
  } catch {
    return null;
  }

  // git-sync v4: --link points at a worktree directory named for the full SHA.
  const base = path.basename(real);
  if (/^[0-9a-f]{40}$/i.test(base)) return base.toLowerCase();

  // Only trust git when this directory is itself a repo root — do not walk up
  // into a parent checkout (sample-catalog inside service-catalog would lie).
  if (!fs.existsSync(path.join(real, ".git"))) return null;

  try {
    const sha = execFileSync("git", ["-C", real, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return /^[0-9a-f]{40}$/i.test(sha) ? sha.toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function loadCatalogSnapshot(): Promise<CatalogSnapshot> {
  const loaded = await loadCatalogDocument();
  return {
    entities: [
      ...loaded.components,
      ...loaded.systems,
      ...loaded.domains,
      ...loaded.apis,
      ...loaded.resources,
      ...loaded.groups,
      ...loaded.users,
    ],
    relations: loaded.relations,
    errors: loaded.errors,
    danglingRefs: loaded.danglingRefs,
  };
}

/**
 * Runtime catalog load for the UI and `/api/catalog.json`.
 * Prefers GitHub when `GITHUB_TOKEN` is set (honeycomb pattern); otherwise
 * reads `$SERVICE_CATALOG` (git-sync from `main` in the cluster).
 */
export async function loadCatalogDocument(): Promise<CatalogDocument> {
  const generatedAt = new Date().toISOString();
  const cfg = githubCatalogConfig();
  if (cfg) {
    try {
      const { snapshot, catalogSha } = await loadCatalogFromGithub(cfg);
      return toDocument(snapshot, catalogSha, "github", generatedAt);
    } catch (e) {
      // Fall through to disk when GitHub is configured but unreachable and a
      // local catalog exists — same last-resort idea as honeycomb's loadIssues.
      if (!process.env.SERVICE_CATALOG && process.env.NODE_ENV === "production") {
        throw e;
      }
      try {
        const disk = await loadFromDisk();
        return toDocument(
          disk.snapshot,
          disk.sha ?? `unavailable:${errorMessage(e)}`,
          "disk",
          generatedAt,
        );
      } catch {
        throw e;
      }
    }
  }

  const disk = await loadFromDisk();
  return toDocument(
    disk.snapshot,
    disk.sha ?? "unknown",
    "disk",
    generatedAt,
  );
}

async function loadFromDisk(): Promise<{
  dir: string;
  sha: string | null;
  snapshot: CatalogSnapshot;
}> {
  const dir = catalogDir();
  const sha = catalogShaFromDir(dir);
  if (diskCached?.dir === dir && diskCached.sha === sha) {
    return diskCached;
  }
  const { entities, errors } = await loadCatalog(dir);
  const snapshot = toCatalogSnapshot(Graph.build(entities), errors);
  const entry = { dir, sha, snapshot };
  if (entities.length > 0 && errors.length === 0) {
    diskCached = entry;
  }
  return entry;
}

function toDocument(
  snapshot: CatalogSnapshot,
  catalogSha: string,
  source: "github" | "disk",
  generatedAt: string,
): CatalogDocument {
  const byKind = Object.fromEntries(
    KIND_BUCKETS.map((kind) => [
      kind,
      snapshot.entities.filter((e) => e.kind === kind),
    ]),
  ) as Record<(typeof KIND_BUCKETS)[number], Entity[]>;

  return {
    generated_at: generatedAt,
    catalog_sha: catalogSha,
    source,
    components: byKind.Component,
    systems: byKind.System,
    domains: byKind.Domain,
    apis: byKind.API,
    resources: byKind.Resource,
    groups: byKind.Group,
    users: byKind.User,
    relations: snapshot.relations,
    errors: snapshot.errors,
    danglingRefs: snapshot.danglingRefs,
  };
}
