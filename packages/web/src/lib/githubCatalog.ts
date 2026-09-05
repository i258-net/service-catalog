import {
  Graph,
  loadCatalogFromSources,
  toCatalogSnapshot,
  type CatalogSnapshot,
  type CatalogSource,
} from "@service-catalog/core";
import type { GithubCatalogConfig } from "./githubCatalogConfig";
import { errorMessage, LastGoodCache } from "./lastGoodCache";

const GH_API = "https://api.github.com";

export type GithubCatalogLoad = {
  snapshot: CatalogSnapshot;
  catalogSha: string;
};

type TreeEntry = {
  path: string;
  type: string;
  sha: string;
  url: string;
};

type GhContentFile = {
  name: string;
  encoding?: string;
  content?: string;
  sha: string;
};

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "service-catalog",
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (errorMessage(e).includes("abort")) {
      throw new Error(`GitHub request timed out after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

async function restJson<T>(cfg: GithubCatalogConfig, path: string): Promise<T> {
  const res = await fetchWithTimeout(
    `${GH_API}${path}`,
    { headers: authHeaders(cfg.token) },
    cfg.timeoutMs,
  );
  if (!res.ok) {
    throw new Error(`GitHub REST ${path} → HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

function decodeContent(file: GhContentFile): string {
  if (!file.content) throw new Error(`GitHub: ${file.name} has no content`);
  return Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8");
}

async function fetchCatalogSources(
  cfg: GithubCatalogConfig,
): Promise<{ commitSha: string; sources: CatalogSource[] }> {
  const commit = await restJson<{ sha: string }>(
    cfg,
    `/repos/${cfg.owner}/${cfg.repo}/commits/${encodeURIComponent(cfg.ref)}`,
  );

  const tree = await restJson<{ tree: TreeEntry[]; truncated: boolean }>(
    cfg,
    `/repos/${cfg.owner}/${cfg.repo}/git/trees/${encodeURIComponent(commit.sha)}?recursive=1`,
  );
  if (tree.truncated) {
    throw new Error(
      `GitHub: recursive tree for ${cfg.owner}/${cfg.repo}@${cfg.ref} was truncated`,
    );
  }

  const yamlPaths = tree.tree
    .filter(
      (e) =>
        e.type === "blob" &&
        /\.ya?ml$/i.test(e.path) &&
        !e.path.split("/").some((p) => p.startsWith(".")),
    )
    .map((e) => e.path)
    .sort();

  const sources: CatalogSource[] = [];
  const concurrency = 8;
  for (let i = 0; i < yamlPaths.length; i += concurrency) {
    const batch = yamlPaths.slice(i, i + concurrency);
    const got = await Promise.all(
      batch.map(async (path) => {
        const body = await restJson<GhContentFile>(
          cfg,
          `/repos/${cfg.owner}/${cfg.repo}/contents/${path
            .split("/")
            .map(encodeURIComponent)
            .join("/")}?ref=${encodeURIComponent(cfg.ref)}`,
        );
        return {
          sourceFile: path,
          text: decodeContent(body),
        } satisfies CatalogSource;
      }),
    );
    sources.push(...got);
  }

  return { commitSha: commit.sha, sources };
}

let cache: LastGoodCache<GithubCatalogLoad> | null = null;
let cacheKey = "";

function catalogCache(cfg: GithubCatalogConfig): LastGoodCache<GithubCatalogLoad> {
  const key = `${cfg.owner}/${cfg.repo}@${cfg.ref}:${cfg.ttlMs}`;
  if (!cache || cacheKey !== key) {
    cache = new LastGoodCache(cfg.ttlMs);
    cacheKey = key;
  }
  return cache;
}

/** Test seam — forget in-process GitHub snapshots. */
export function resetGithubCatalogCache(): void {
  cache = null;
  cacheKey = "";
}

export async function loadCatalogFromGithub(
  cfg: GithubCatalogConfig,
): Promise<GithubCatalogLoad> {
  const hit = await catalogCache(cfg).get(async () => {
    const { commitSha, sources } = await fetchCatalogSources(cfg);
    const { entities, errors } = loadCatalogFromSources(sources);
    return {
      catalogSha: commitSha,
      snapshot: toCatalogSnapshot(Graph.build(entities), errors),
    };
  });
  return hit.value;
}
