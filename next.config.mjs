import analyzer from "@next/bundle-analyzer";

// `ANALYZE=true next build` writes the treemaps to <distDir>/analyze/ without
// opening a browser (docs/arquitetura.md, "Desempenho", reads them from there).
const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Opt-in for local measurements (a production build beside `next dev`
  // without the two overwriting each other's .next). Unset everywhere else.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
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

  // Dev only, opt-in for the browser suites (tests/ui/README.md): next dev
  // disposes a page idle for 60 s and keeps 5, so three Playwright workers
  // over ~45 routes kept recompiling them mid-test, and post-hydration waits
  // timed out under that load. No effect on `next build`/`next start`.
  ...(process.env.NEXT_DEV_KEEP_PAGES === "1"
    ? {
        onDemandEntries: {
          maxInactiveAge: 4 * 60 * 60 * 1000,
          pagesBufferLength: 200,
        },
      }
    : {}),
  images: {
    // Modern formats first; Next falls back to the original on older browsers.
    formats: ["image/avif", "image/webp"],

    // No external host in production: whatever is listed here, anyone can
    // make this server fetch and decode through `/_next/image` — an
    // anonymous path into sharp's AVIF/HEIF decoder, which has published
    // memory-corruption advisories.
    remotePatterns: [
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
    // src/instrumentation.ts: the server checks its environment at boot and
    // refuses to start with a missing or invalid variable (src/env).
    instrumentationHook: true,

    gzipSize: true,
    scrollRestoration: true,

    // Decision 2.4: going back to a tab never reuses a stale server render
    // (the default kept dynamic RSC for 30 s). Prerendered pages keep their
    // own default.
    staleTimes: {
      dynamic: 0,
    },

    // The blog, legal and developer portal pages read their MDX from disk.
    // They are prerendered or cached, but a render at run time must not find
    // the folder missing from the standalone output. Keys are globs matched
    // with `contains`: "/blog" covers /blog/[slug] and its OG image too, and
    // "/docs" covers /docs/[slug] and /docs/referencia (a literal "[slug]"
    // would be read as a character class).
    outputFileTracingIncludes: {
      "/blog": ["./src/content/blog/**/*.mdx"],
      "/feed.xml": ["./src/content/blog/**/*.mdx"],
      "/sitemap.xml": ["./src/content/**/*.mdx"],
      "/legal": ["./src/content/legal/**/*.mdx"],
      "/docs": ["./src/content/docs/**/*.mdx"],
    },

    // Tree-shake aggressively for libraries with heavy index files.
    // Cuts ~30-40% off bundle for landing pages using lucide-react.
    // Only packages actually installed AND imported by name here. The option
    // is keyed on the import specifier in our own source, so listing a package
    // we do not import — or one that only shows up as a transitive dependency
    // of another library — does nothing at all.
    //
    // Icon libraries other than lucide-react are gone (consolidated onto it).
    //
    // Note that @radix-ui/react-icons is an icon set, NOT the @radix-ui/react-*
    // primitives we do use — those already ship one small entry point per
    // package, so there is no barrel for this option to optimize.
    // Measured, not assumed. Adding `lodash` and `date-fns` here made the kanban
    // routes 24 kB HEAVIER (246 kB -> 270 kB): the barrel optimizer rewrites
    // each named import into its own deep import, and those deep modules stop
    // being shared across chunks. Next 14 already auto-optimizes date-fns and
    // lucide-react anyway.
    //
    // Anything added here must be verified with a real build, in both
    // directions — @tanstack/react-table failed outright, these two passed the
    // build and still cost size.
    optimizePackageImports: ["lucide-react"],
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
      // Off, not "1; mode=block": that drove a filter browsers have removed,
      // and where it survives it was used to blank out pages selectively
      // (XS-Leaks). The script policy is the CSP's job now.
      {
        key: "X-XSS-Protection",
        value: "0",
      },
      // Nothing frames this app, itself included (no <iframe> of our own
      // pages anywhere): DENY, with frame-ancestors 'none' in the CSP for the
      // browsers that read only that.
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      // The full URL stays on this origin; another site gets the origin only,
      // and nothing over a downgrade to http. The public tracking and proof
      // pages carry their token in the path, so no other site may see it.
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      // Only what a page here uses: geolocation (the location picker's "use
      // my position") on this origin, nothing else. An injected or embedded
      // script cannot turn on the camera, the microphone or payments.
      {
        key: "Permissions-Policy",
        value: [
          "accelerometer=()",
          "autoplay=()",
          "bluetooth=()",
          "browsing-topics=()",
          "camera=()",
          "display-capture=()",
          "geolocation=(self)",
          "gyroscope=()",
          "hid=()",
          "magnetometer=()",
          "microphone=()",
          "midi=()",
          "payment=()",
          "serial=()",
          "usb=()",
          "xr-spatial-tracking=()",
        ].join(", "),
      },
      // A page opened from here (a proof photo, the docs console) cannot
      // reach back through window.opener, nor can one that opens us.
      {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin",
      },

      // The directives nothing depends on, for every response the middleware
      // does not answer (static files): no plugins, no <base> rewriting every
      // relative URL, no framing, no form posting off-site. Pages get the
      // enforced policy with the nonce-based script-src from the middleware
      // (src/lib/content-security-policy.ts), which repeats all of these.
      {
        key: "Content-Security-Policy",
        value:
          "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
      },
    ];

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },

      // Tokenised pages are Disallowed in robots.txt, which also stops a
      // crawler from reading their noindex; a URL linked from elsewhere could
      // still be listed. The header travels with the response itself.
      ...["/verificar/:path*", "/acompanhar/:path*"].map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },

  // Public pages moved to Portuguese slugs (legal with the MDX rewrite, the
  // institutional ones by decision 16.20); e-mails, bookmarks and search
  // results still carry the old ones. Permanent (308) so the ranking moves.
  async redirects() {
    return [
      { source: "/about", destination: "/sobre", permanent: true },
      { source: "/contact", destination: "/contato", permanent: true },
      { source: "/quote", destination: "/orcamento", permanent: true },
      {
        source: "/legal/terms",
        destination: "/legal/termos",
        permanent: true,
      },
      {
        source: "/legal/privacy",
        destination: "/legal/privacidade",
        permanent: true,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
