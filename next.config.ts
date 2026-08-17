import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * react-icons ships one enormous barrel per icon set. Importing a handful of
   * names still pulls the whole module graph — measured at ~4s for
   * react-icons/tb alone. This rewrites those imports to direct per-icon paths.
   */
  experimental: {
    optimizePackageImports: [
      "react-icons/fi",
      "react-icons/tb",
      "react-icons/hi2",
      "react-icons/fa",
      "react-icons/fc",
      "react-icons",
    ],
  },

  // Turbopack resolves the workspace root from the nearest lockfile; be explicit
  // so a stray lockfile above this folder cannot change the build.
  turbopack: { root: __dirname },

  /**
   * Emits .next/standalone with a self-contained server.js and only the
   * node_modules actually reached. That is what the Dockerfile ships, and it
   * turns a ~700MB build directory into a small image.
   *
   * NOT compatible with `output: "export"` — CAIRN cannot be statically
   * exported at all. It has API routes, server actions, middleware and a
   * database, so it needs a running Node server.
   */
  output: "standalone",

  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
