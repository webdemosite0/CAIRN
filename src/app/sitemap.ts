import type { MetadataRoute } from "next";

import { FEATURES } from "@/lib/features";
import { publicRoutes, site } from "@/lib/site";

/**
 * Every page a visitor can reach without an account, and nothing else.
 *
 * The capability pages are read from FEATURES rather than listed again, so a
 * page cannot be added to the site and forgotten here — the previous list was
 * maintained by hand and had drifted into advertising twelve routes that all
 * redirected to the sign-in form.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const fixed = publicRoutes.map((r) => ({
    url: `${site.url}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const features = FEATURES.map((f) => ({
    url: `${site.url}/features/${f.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...fixed, ...features];
}
