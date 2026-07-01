import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 (native .node) and app-info-parser (uses fs/zip internals)
  // must NOT be bundled by Turbopack/webpack — load them at runtime instead.
  serverExternalPackages: ["better-sqlite3", "app-info-parser"],
};

export default nextConfig;
