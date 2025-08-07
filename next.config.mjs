import analyzer from "@next/bundle-analyzer";

import nextBuildId from "next-build-id";
import plugins from "next-compose-plugins";

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: async () => nextBuildId(),
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    // Domains for external images
    domains: [
      "cdn.sanity.io",
      "images.unsplash.com",
      "avatar.vercel.sh",
      "picsum.photos",
    ],
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  compress: true,
  // Security Headers based on: https://nextjs.org/docs/advanced-features/security-headers
  async headers() {
    const securityHeaders = [
      {
        key: "X-DNS-Prefetch-Control",
        value: "on",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "X-XSS-Protection",
        value: "1; mode=block",
      },
      {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "origin-when-cross-origin",
      },
    ];

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default plugins([withBundleAnalyzer], nextConfig);
