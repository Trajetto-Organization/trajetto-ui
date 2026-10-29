/**
 * The legal pages that exist, in navigation order. Client-safe: the footer
 * and the sign-in forms link to them without reading the MDX files.
 *
 * The loader (legal.ts) fails when a slug here has no
 * `src/content/legal/<slug>.mdx` or a file there is missing from this list.
 */
export const LEGAL_DOCUMENTS = [
  { slug: "termos", label: "Termos de Uso" },
  { slug: "privacidade", label: "Política de Privacidade" },
  { slug: "cookies", label: "Política de Cookies" },
] as const;

export type LegalSlug = (typeof LEGAL_DOCUMENTS)[number]["slug"];

export function legalPath(slug: LegalSlug): string {
  return `/legal/${slug}`;
}

/**
 * The English slugs the site used before the MDX move. Permanent redirects
 * in next.config.mjs keep old links (e-mails, bookmarks) working.
 */
export const LEGACY_LEGAL_SLUGS: Record<string, LegalSlug> = {
  terms: "termos",
  privacy: "privacidade",
};

/**
 * Section 3 of the privacy policy is the one that covers the site's forms
 * (quote and contact): the notice at the point of collection (LGPD art. 9º)
 * links here. The fragment is rehype-slug's id for that heading; a test
 * renders the policy and fails if the heading is renamed.
 */
export const FORM_PRIVACY_HREF = `${legalPath("privacidade")}#3-site-e-pedidos-de-orçamento`;
