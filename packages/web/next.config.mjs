import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@service-catalog/core"],
  env: {
    SERVICE_CATALOG:
      process.env.SERVICE_CATALOG ?? path.resolve(packageDir, "../../sample-catalog"),
  },
};

export default nextConfig;
