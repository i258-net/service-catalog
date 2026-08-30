import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(packageDir, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@service-catalog/core", "@i258/ui"],
  output: "standalone",
  // Trace dependencies from the monorepo root so @service-catalog/core resolves.
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
