import "server-only";
import { Graph, loadCatalog, toCatalogSnapshot, type CatalogSnapshot } from "@service-catalog/core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

let cached: { dir: string; snapshot: CatalogSnapshot } | undefined;

export function catalogDir(): string {
  const dir = process.env.SERVICE_CATALOG;
  if (dir) return fs.realpathSync(dir);
  if (process.env.NODE_ENV === "production") {
    throw new Error("SERVICE_CATALOG is required in production");
  }
  return path.resolve(moduleDir, "../../../../sample-catalog");
}

export async function loadCatalogSnapshot(): Promise<CatalogSnapshot> {
  const dir = catalogDir();
  if (cached?.dir === dir) return cached.snapshot;
  const { entities, errors } = await loadCatalog(dir);
  const snapshot = toCatalogSnapshot(Graph.build(entities), errors);
  if (entities.length > 0 && errors.length === 0) {
    cached = { dir, snapshot };
  }
  return snapshot;
}
