export type GithubCatalogConfig = {
  token: string;
  owner: string;
  repo: string;
  ref: string;
  ttlMs: number;
  timeoutMs: number;
};

/**
 * When `GITHUB_TOKEN` is set, the catalog JSON API (and shared loader) fetch
 * `i258-net/catalog` from GitHub at runtime — same shape as honeycomb's
 * register load. Without a token, callers fall back to `$SERVICE_CATALOG`
 * (git-sync in the cluster).
 */
export function githubCatalogConfig(
  env: NodeJS.ProcessEnv = process.env,
): GithubCatalogConfig | null {
  const token = env.GITHUB_TOKEN?.trim();
  if (!token) return null;

  const spec = (env.GITHUB_CATALOG_REPO ?? "i258-net/catalog").trim();
  const { owner, repo } = splitRepo(spec);

  return {
    token,
    owner,
    repo,
    ref: (env.GITHUB_CATALOG_REF ?? "main").trim(),
    ttlMs: positiveInt(env.GITHUB_CACHE_TTL_MS, 60_000),
    timeoutMs: positiveInt(env.GITHUB_TIMEOUT_MS, 15_000),
  };
}

function splitRepo(spec: string): { owner: string; repo: string } {
  const [owner, repo] = spec.split("/");
  if (!owner || !repo) {
    throw new Error(`repo spec must be owner/name (got ${JSON.stringify(spec)})`);
  }
  return { owner, repo };
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
