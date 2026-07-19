import "server-only";
import { Graph, loadCatalog, toCatalogSnapshot, type CatalogSnapshot } from "@bones/core";
import path from "node:path";

let cached: { dir: string; snapshot: CatalogSnapshot } | undefined;

export function catalogDir(): string {
  return process.env.BONES_CATALOG ?? path.resolve(process.cwd(), "../../sample-catalog");
}

export async function loadCatalogSnapshot(): Promise<CatalogSnapshot> {
  const dir = catalogDir();
  if (cached?.dir === dir) return cached.snapshot;
  const { entities, errors } = await loadCatalog(dir);
  const snapshot = toCatalogSnapshot(Graph.build(entities), errors);
  cached = { dir, snapshot };
  return snapshot;
}
