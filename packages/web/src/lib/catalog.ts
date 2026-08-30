import "server-only";
import { Graph, loadCatalog, toCatalogSnapshot, type CatalogSnapshot } from "@service-catalog/core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

let cached: { dir: string; snapshot: CatalogSnapshot } | undefined;

export function catalogDir(): string {
  return (
    process.env.SERVICE_CATALOG ??
    path.resolve(moduleDir, "../../../../sample-catalog")
  );
}

export async function loadCatalogSnapshot(): Promise<CatalogSnapshot> {
  const dir = catalogDir();
  if (cached?.dir === dir) return cached.snapshot;
  const { entities, errors } = await loadCatalog(dir);
  const snapshot = toCatalogSnapshot(Graph.build(entities), errors);
  cached = { dir, snapshot };
  return snapshot;
}
