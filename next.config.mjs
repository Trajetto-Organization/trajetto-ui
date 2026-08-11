import analyzer from "@next/bundle-analyzer";

import plugins from "next-compose-plugins";

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // No custom `generateBuildId`: a random id per build changes the build hash
  // every time, invalidating every client chunk on each deploy even when the
  // code did not change. Next's default derives a stable id from the build
  // output, so unchanged chunks keep their hash and stay cached in the browser.
  output: "standalone",
  compress: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error"], // Keep only console.error if something goes wrong
          }
        : false,
  },

  // Don't advertise the framework in HTTP headers (small security win).
  poweredByHeader: false,
  images: {
    // Modern formats first; Next falls back to the original on older browsers.
    formats: ["image/avif", "image/webp"],

    // Remote patterns for external images
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      // Local backend development
      ...(process.env.NODE_ENV === "development"
        ? [
            {
              protocol: "http",
              hostname: "localhost",
              port: "3333",
              pathname: "/tmp/**",
            },
          ]
        : []),
    ],
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  experimental: {
    gzipSize: true,
    scrollRestoration: true,

    // Tree-shake aggressively for libraries with heavy index files.
    // Cuts ~30-40% off bundle for landing pages using lucide-react.
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "@radix-ui/react-icons",
      "@tabler/icons-react",
      "@sanity/icons",
      "@sanity/ui",
      "framer-motion",
      "radix-ui",
    ],
    outputFileTracingExcludes: {
      "*": [
        // Excludes SWC binaries for systems that are NOT the server (Mac and Windows)
        "node_modules/@swc/core-darwin-x64",
        "node_modules/@swc/core-darwin-arm64",
        "node_modules/@swc/core-win32-x64-msvc",
        "node_modules/@swc/core-win32-ia32-msvc",
        "node_modules/@swc/core-win32-arm64-msvc",

        // Playwright is huge (it includes browser binaries)
        // It's in devDependencies, but the tracer might get confused if there are any accidental imports
        "node_modules/@playwright/**",
        "node_modules/playwright/**",

        // Linting, typing, and strict formatting tools (useless at runtime)
        "node_modules/eslint/**",
        "node_modules/prettier/**",
        "node_modules/typescript/**",

        // Internal test files for third-party libraries (Leaflet, Radix, etc.)
        "node_modules/**/__tests__/**",
        "node_modules/**/*.test.js",
        "node_modules/**/*.spec.js",
        "node_modules/**/*.md", // Optional: remove heavy readmes from within node_modules
      ],
    },
  },

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
