import { MetadataRoute } from "next";

import { absoluteUrl, isIndexable } from "@/lib/site";

/**
 * Per request: APP_ENV decides, and one image is promoted from staging to
 * production, so a robots.txt frozen at build would answer for the wrong
 * environment.
 */
export const dynamic = "force-dynamic";

/**
 * Permissive on purpose. Google renders pages like a browser and must fetch
 * /_next/ (CSS, JS, optimized images); blocking it gets pages indexed
 * unstyled. Duplicate URLs such as /blog?tag=x are handled by canonicals,
 * not here. Robots paths are prefixes, so "/admin" covers "/admin/...".
 */
const robots = (): MetadataRoute.Robots => {
  if (!isIndexable()) {
    // Staging and local servers: nothing to crawl, no sitemap to advertise.
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Signed-in areas.
          "/dashboard",
          "/admin",
          "/profile",
          "/notifications",
          "/driver",
          "/api/",
          "/new-verification",

          // Tokenised public pages: the token in the URL is the whole
          // authorisation, so a crawler must never reach one — indexing a
          // tracking link would publish somebody's delivery. The pages also
          // send `X-Robots-Tag: noindex` (next.config.mjs) and carry noindex
          // in their metadata.
          "/verificar/",
          "/acompanhar/",

          // Password reset and verification links.
          "/*?*token=",
        ],
      },

      // SEO crawlers that only consume bandwidth.
      {
        userAgent: [
          "SemrushBot",
          "AhrefsBot",
          "MJ12bot",
          "DotBot",
          "BLEXBot",
          "DataForSeoBot",
        ],
        disallow: "/",
      },
    ],

    sitemap: absoluteUrl("/sitemap.xml"),
  };
};

export default robots;
