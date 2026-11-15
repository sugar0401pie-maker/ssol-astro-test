import type { MetadataRoute } from "next";
import { PAGE_UPDATED, PUBLIC_PATHS, SIGN_PAGES_UPDATED, SIGN_SLUGS, SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = PUBLIC_PATHS.map((p) => ({
    url: p === "/" ? SITE_URL : `${SITE_URL}${p}`,
    lastModified: PAGE_UPDATED[p],
    changeFrequency: p === "/" ? "weekly" : "monthly",
    priority: p === "/" ? 1 : p === "/about" ? 0.8 : p.startsWith("/about/") ? 0.6 : 0.3,
  }));
  // 12별자리 페이지(owner 2026-11-15)
  const signs: MetadataRoute.Sitemap = SIGN_SLUGS.map((s) => ({
    url: `${SITE_URL}/about/signs/${s}`,
    lastModified: SIGN_PAGES_UPDATED,
    changeFrequency: "monthly",
    priority: 0.5,
  }));
  return [...pages, ...signs];
}
