/**
 * The public site's identity: canonical origin, environment and the facts
 * every metadata block, sitemap entry and JSON-LD node repeats.
 *
 * Read per call, not at module load: robots.txt runs per request so one
 * image can be promoted from staging to production and still answer for the
 * environment it is running in.
 */

const DEFAULT_SITE_URL = "http://localhost:3000";

export const siteConfig = {
  name: "Trajetto",
  legalName: "Trajetto Sistemas Ltda",
  tagline: "Gestão de frotas e de entregas",
  description:
    "Plataforma para transportadoras e frotistas: veículos, motoristas, abastecimentos, manutenção, entregas, rotas, torre de controle e comprovante digital, com app Android para o motorista.",
  locale: "pt-BR",
  /** Open Graph wants the underscore form. */
  ogLocale: "pt_BR",
  email: "contato@intrajetto.com",
  blogAuthor: "Equipe Trajetto",
  /** Brand pink, the same one the buttons and links use. */
  themeColor: "#d81b60",
  /**
   * The brand's official profiles. The footer links them, the home page's
   * Organization JSON-LD lists them as `sameAs` and the X cards name the
   * handle: one list, so a crawler sees the same accounts everywhere.
   */
  socialProfiles: [
    {
      network: "linkedin",
      label: "Trajetto no LinkedIn",
      href: "https://www.linkedin.com/company/trajetto-official",
    },
    {
      network: "instagram",
      label: "Trajetto no Instagram",
      href: "https://www.instagram.com/trajetto_official",
    },
    {
      network: "x",
      label: "Trajetto no X",
      href: "https://x.com/Trajetto",
      handle: "@Trajetto",
    },
  ],
} as const;

/** The X account the page cards attribute to. */
export const X_HANDLE = siteConfig.socialProfiles.find(
  (profile) => profile.network === "x",
)?.handle;

/** What the root layout's title template appends to every page title. */
export const TITLE_SUFFIX = ` | ${siteConfig.name}`;

/**
 * Search results cut the <title> around 60 characters, suffix included, so
 * a page title may use what is left (49).
 */
export const MAX_PAGE_TITLE_LENGTH = 60 - TITLE_SUFFIX.length;

export type AppEnv = "development" | "staging" | "production";

const APP_ENVS: readonly AppEnv[] = ["development", "staging", "production"];

/** The http(s) origin of METADATA_BASE, or null when it is missing or broken. */
function configuredOrigin(): string | null {
  const raw = process.env.METADATA_BASE?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);

    // Other schemes parse but have the opaque origin "null".
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

/**
 * Canonical origin without trailing slash.
 *
 * Localhost only while developing: a production build without METADATA_BASE
 * would prerender canonicals, the sitemap, the feed and the JSON-LD on
 * localhost, and nothing else would notice.
 */
export function siteUrl(): string {
  const origin = configuredOrigin();
  if (origin) return origin;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "METADATA_BASE ausente ou inválida: defina a URL pública do site (ex.: https://www.intrajetto.com). Sem ela, canonical, sitemap, feed e JSON-LD apontariam para localhost.",
    );
  }

  return DEFAULT_SITE_URL;
}

/** Absolute URL on the canonical origin. */
export function absoluteUrl(path: string = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;

  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

let warnedUnknownAppEnv = false;

/**
 * APP_ENV when it is one of ours. Unset, a production build counts as
 * production, so an image deployed without the variable stays indexable.
 * Set to anything else ("homolog", "prod"), it counts as a non-production
 * stack: a typo must fail closed, not open a staging stack to search.
 */
export function appEnv(): AppEnv {
  const value = process.env.APP_ENV?.trim().toLowerCase();

  if (!value) {
    return process.env.NODE_ENV === "production" ? "production" : "development";
  }

  if ((APP_ENVS as readonly string[]).includes(value)) return value as AppEnv;

  if (!warnedUnknownAppEnv) {
    warnedUnknownAppEnv = true;
    console.warn(
      `APP_ENV="${value}" não é development, staging nem production; tratado como staging (fora da indexação).`,
    );
  }

  return "staging";
}

/**
 * Only production may be crawled; staging and local servers never.
 *
 * Call it per request only (robots.txt, the middleware). Prerendered
 * metadata and next.config headers keep what the build saw, and the image
 * built once is promoted to production: a staging answer baked there would
 * de-index production.
 */
export function isIndexable(): boolean {
  return appEnv() === "production";
}
