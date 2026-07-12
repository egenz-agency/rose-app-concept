import type { MetadataRoute } from "next"

// Keep private gifts, dashboards, and auth out of search indexes. Only public
// marketing/legal surfaces should be crawlable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/legal/"],
        disallow: ["/r/", "/dashboard", "/login", "/auth/"],
      },
    ],
  }
}
