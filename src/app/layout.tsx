import type { Metadata } from "next";
import localFont from "next/font/local";

import { ThemeProvider } from "@/providers/theme-provider";
import { DeploymentSkewGuard } from "@/components/shared/deployment-skew-guard";
import { StrictCspGuard } from "@/components/shared/strict-csp-guard";
import { PublicConfigScript } from "@/env/public-config-script";
import { THEME_INIT_SCRIPT } from "@/lib/theme-init-script";
import { TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT } from "@/lib/trusted-types-default-policy";
import { TITLE_SUFFIX, X_HANDLE, siteConfig, siteUrl } from "@/lib/site";

import "./globals.css";

/*
 * Self-hosted by next/font: the files are served from this origin, so the
 * CSP's font-src 'self' covers them and no request goes to Google. They live
 * in ./fonts (Google Fonts' latin subset, where they came from: ./fonts/
 * README.md), so the build reads them from the repository: with
 * next/font/google it downloaded them on every build, and a failed download
 * failed the build. Inter Tight stands in for the design's SF Pro Display,
 * whose license does not allow embedding it on a website. Exposed as CSS
 * variables: Inter is the whole product's text face (Tailwind's `font-sans`,
 * so the app and the auth pages too, decision 16.122), and the public site
 * adds Inter Tight for display headings and JetBrains Mono through the
 * font-site-* utilities. 700 is for the app's `font-bold` (47 uses), which
 * would otherwise be a faux bold.
 *
 * Inter and Inter Tight are variable files; each declares only the weights
 * the product uses, as the Google loader did, so a weight outside them still
 * snaps to the nearest one instead of drawing a new one. The unicode-range is
 * the one Google gives its latin subset, written out in each call: next/font
 * reads these options at build time and takes literals only.
 */
const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "400 700",
  display: "swap",
  variable: "--font-inter",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

const interTight = localFont({
  src: "./fonts/inter-tight-latin.woff2",
  weight: "500 600",
  display: "swap",
  variable: "--font-inter-tight",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

/*
 * Not preloaded: this root layout's preloads go out on every page, the
 * logged-in app included, and the mono face only sets small labels (the
 * eyebrows, a figure in a mockup) that swap in unnoticed. Inter Tight stays
 * preloaded: it is the landing hero's <h1> and the header's logo type, the
 * largest text above the fold.
 */
const jetBrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin.woff2",
  weight: "500",
  display: "swap",
  variable: "--font-jetbrains-mono",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  preload: false,
});

/**
 * Site-wide defaults. No canonical here on purpose: every page that forgot
 * its own inherited this one and told Google it was the home page. Pages set
 * theirs through `buildPageMetadata`.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: `${siteConfig.name} | ${siteConfig.tagline}`,
      template: `%s${TITLE_SUFFIX}`,
    },
    description: siteConfig.description,
    keywords: [
      "gestão de frotas",
      "gestão de entregas",
      "comprovante de entrega digital",
      "torre de controle",
      "app do motorista",
      "controle de abastecimento",
      "checklist veicular",
      "manutenção de frota",
      "rastreamento de entregas",
      "importação de NF-e",
      "Trajetto",
    ],
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.blogAuthor,
    publisher: siteConfig.legalName,
    applicationName: siteConfig.name,
    category: "Gestão de frotas e de entregas",

    // Not tied to APP_ENV: prerendered pages keep what the build saw, and
    // the image is promoted from staging to production. Staging is kept out
    // of search at run time instead (robots.txt reads APP_ENV per request).
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    // No `url`, for the same reason as no canonical: share cards read og:url
    // as the canonical. Pages set theirs through `buildPageMetadata`.
    openGraph: {
      title: `${siteConfig.name} | ${siteConfig.tagline}`,
      description: siteConfig.description,
      siteName: siteConfig.name,
      images: [
        {
          url: "/og-default.jpg",
          width: 1200,
          height: 630,
          alt: `${siteConfig.name}: ${siteConfig.tagline.toLowerCase()}`,
          type: "image/jpeg",
        },
      ],
      locale: siteConfig.ogLocale,
      type: "website",
    },

    twitter: {
      card: "summary_large_image",
      site: X_HANDLE,
      creator: X_HANDLE,
      title: `${siteConfig.name} | ${siteConfig.tagline}`,
      description: siteConfig.description,
      images: ["/og-default.jpg"],
    },

    icons: {
      icon: [{ url: "/favicon.ico" }],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },

    other: {
      "theme-color": siteConfig.themeColor,
      "color-scheme": "light dark",
      "format-detection": "telephone=no",
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "black-translucent",
      "msapplication-TileColor": siteConfig.themeColor,
    },
  };
}

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${interTight.variable} ${jetBrainsMono.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        {/*
          The saved theme on <html> before the first paint. A constant text,
          allowed by its hash in the enforced CSP (src/lib/theme-init-script.ts);
          next-themes' own copy is switched off in the ThemeProvider.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/*
          The Trusted Types "default" policy, before hydration: lets the
          captcha's api.js (set by react-turnstile as a raw string) through,
          and nothing else. A constant text too, allowed by its hash
          (src/lib/trusted-types-default-policy.ts).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT,
          }}
        />
        {/*
          The public configuration (API URL, captcha key, map tiles) read
          from this server's environment, not from the build (decision 12.2).
          First in <body>, so it is in the document before any script runs.
        */}
        <PublicConfigScript />
        {/*
          `attribute="class"` is not decoration — without it the dark theme
          does not exist.

          next-themes defaults to `data-theme`, and Tailwind here is
          configured with `darkMode: ["class"]`, which looks for the `.dark`
          CLASS. The two never met: the provider wrote `data-theme="dark"` on
          <html>, no `dark:` utility ever matched, and the ~700 dark variants
          in this codebase had never rendered once.

          No `disableTransitionOnChange`: it froze every transition during
          the switch (the auth page's sliding cards jumped). The theme
          controls switch through a view transition instead, one
          cross-fade of the whole page (switchTheme in
          src/components/shared/theme-toggle). The first paint never
          animates: the init script sets the class before any style.
        */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Offers a reload when a deploy leaves this tab on the old build. */}
          <DeploymentSkewGuard />
          {/* Reloads a per-request page soft-navigated into from a prerendered one. */}
          <StrictCspGuard />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
