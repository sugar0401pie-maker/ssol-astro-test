import type { MetadataRoute } from "next";
import { DISALLOW_PATHS, SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...DISALLOW_PATHS] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
