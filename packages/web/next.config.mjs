import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@bones/core"],
  env: {
    BONES_CATALOG:
      process.env.BONES_CATALOG ?? path.resolve(packageDir, "../../sample-catalog"),
  },
};

export default nextConfig;
