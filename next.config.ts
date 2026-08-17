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
   * Standalone emits .next/standalone — a self-contained server.js with only
   * the node_modules actually reached. That is what the Dockerfile ships, and
   * it turns an ~860MB build directory into a 31MB image.
   *
   * But it must be OFF on Vercel. Vercel runs its own file tracing and expects
   * .next/next-server.js.nft.json where a default build puts it; standalone
   * relocates that, and the deploy dies with:
   *
   *   ENOENT: no such file or directory, open '.next/next-server.js.nft.json'
   *
   * Vercel sets VERCEL=1 on every build, so each target gets what it needs
   * with no flag to remember.
   *
   * Neither mode allows `output: "export"` — CAIRN has API routes, server
   * actions, middleware and a database, so it cannot be a static site.
   */
  output: process.env.VERCEL ? undefined : "standalone",

  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
