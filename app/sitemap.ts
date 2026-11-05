import type { MetadataRoute } from "next";
import { PAGE_UPDATED, PUBLIC_PATHS, SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((p) => ({
    url: p === "/" ? SITE_URL : `${SITE_URL}${p}`,
    lastModified: PAGE_UPDATED[p],
    changeFrequency: p === "/" ? "weekly" : "monthly",
    priority: p === "/" ? 1 : p === "/about" ? 0.8 : p.startsWith("/about/") ? 0.6 : 0.3,
  }));
}
