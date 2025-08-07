import { MetadataRoute } from "next";

const robots = (): MetadataRoute.Robots => {
  const baseUrl = process.env.METADATA_BASE;

  return {
    rules: [
      // General rules for all crawlers
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/blog",
          "/blog/*",
          "/contact",
          "/quote",
          "/legal/*",
          "/login",
          "/forgot",
          "/static/*",
          "/images/*",
          "/favicon.ico",
          "/robots.txt",
          "/sitemap.xml",
        ],
        disallow: [
          // Protected pages
          "/dashboard*",
          "/admin*",
          "/profile*",
          "/notifications*",

          // Verification Pages
          "/new-verification*",

          // API endpoints
          "/api/*",

          // Next.js Internal Files
          "/_next/*",
          "/_vercel/*",

          // Configuration files
          "*.json$",
          "*.xml$",
          "*.txt$",

          // Private directories
          "/private/*",
          "/admin/*",
          "/temp/*",
          "/uploads/*",

          // URLs with sensitive parameters
          "*?token=*",
          "*?password=*",
          "*?key=*",
          "*?auth=*",

          // Error pages
          "/404",
          "/500",
          "/error",

          // Backup files
          "*.bak$",
          "*.backup$",

          // Development Directories
          "/test/*",
          "/tests/*",
          "/spec/*",
          "/.env*",
          "/.git*",
          "/node_modules/*",
        ],
        crawlDelay: 1, // 1 second between requests
      },

      // Specific optimizations for Google
      {
        userAgent: "Googlebot",
        allow: [
          "/",
          "/about",
          "/blog",
          "/login",
          "/forgot",
          "/blog/*",
          "/contact",
          "/quote",
          "/legal/*",
        ],
        disallow: [
          "/dashboard*",
          "/admin*",
          "/profile*",
          "/notifications*",
          "/new-verification*",
          "/api/*",
          "/_next/*",
        ],
        crawlDelay: 0, // Google may crawl more aggressively
      },

      // Optimizations for Bing
      {
        userAgent: "Bingbot",
        allow: [
          "/",
          "/about",
          "/blog",
          "/blog/*",
          "/contact",
          "/quote",
          "/legal/*",
        ],
        disallow: [
          "/dashboard*",
          "/admin*",
          "/profile*",
          "/notifications*",
          "/new-verification*",
          "/api/*",
          "/_next/*",
        ],
        crawlDelay: 1,
      },

      // Allow social media crawlers for Open Graph
      {
        userAgent: "facebookexternalhit",
        allow: "/",
      },
      {
        userAgent: "Twitterbot",
        allow: "/",
      },
      {
        userAgent: "LinkedInBot",
        allow: "/",
      },
      {
        userAgent: "WhatsApp",
        allow: "/",
      },

      // Block known malicious crawlers
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

    // Sitemap location - critical for SEO
    sitemap: `${baseUrl}/sitemap.xml`,

    // Host directive (optional, but recommended)
    host: baseUrl,
  };
};

export default robots;
