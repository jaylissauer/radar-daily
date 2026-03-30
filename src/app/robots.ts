import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/saved", "/sources"],
    },
    sitemap: baseUrl ? [`${baseUrl}/sitemap.xml`] : undefined,
  };
}
