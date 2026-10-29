/**
 * The developer portal's pages, in reading order. Client-safe: the header,
 * the sidebar and the pager read it without touching the MDX files.
 *
 * A guide is `src/content/docs/<slug>.mdx`; the loader (guides.ts) fails when
 * a slug here has no file or a file is missing from this list, so the menu
 * can never point at a page that does not exist.
 */

const API_DOCS_PATH = "/docs";
const DOCS_REFERENCE_PATH = "/docs/referencia";

/** Redirects to the interactive console on the API (decision 11.2). */
const DOCS_CONSOLE_PATH = "/docs/console";

/**
 * Where the portal shows its full navigation and the sections column; below
 * it, a menu button holds both. The site header's breakpoint (960px).
 */
const DOCS_DESKTOP_QUERY = "(min-width: 960px)";

/** The guide served at /docs itself. */
const DOCS_INDEX_SLUG = "visao-geral";

type DocsNavItem =
  | { kind: "guide"; slug: string; title: string }
  | { kind: "page"; href: string; title: string }
  | { kind: "console"; href: string; title: string };

interface DocsSection {
  title: string;
  items: DocsNavItem[];
}

const DOCS_SECTIONS: readonly DocsSection[] = [
  {
    title: "Primeiros passos",
    items: [
      { kind: "guide", slug: DOCS_INDEX_SLUG, title: "Visão geral" },
      { kind: "guide", slug: "comeco-rapido", title: "Começo rápido" },
      { kind: "guide", slug: "autenticacao", title: "Autenticação e escopos" },
    ],
  },
  {
    title: "Usando a API",
    items: [
      { kind: "guide", slug: "paginacao", title: "Paginação e sincronização" },
      { kind: "guide", slug: "idempotencia", title: "Idempotência" },
      { kind: "guide", slug: "erros", title: "Erros" },
      { kind: "guide", slug: "limites", title: "Limites de uso" },
    ],
  },
  {
    title: "Webhooks",
    items: [
      { kind: "guide", slug: "webhooks", title: "Receber webhooks" },
      { kind: "guide", slug: "assinatura", title: "Verificar a assinatura" },
    ],
  },
  {
    title: "Referência",
    items: [
      { kind: "page", href: DOCS_REFERENCE_PATH, title: "Referência da API" },
      { kind: "console", href: DOCS_CONSOLE_PATH, title: "Console interativo" },
    ],
  },
  {
    title: "Novidades",
    items: [{ kind: "guide", slug: "changelog", title: "Changelog" }],
  },
];

function docsGuideHref(slug: string): string {
  return slug === DOCS_INDEX_SLUG ? API_DOCS_PATH : `${API_DOCS_PATH}/${slug}`;
}

function hrefOf(item: DocsNavItem): string {
  return item.kind === "guide" ? docsGuideHref(item.slug) : item.href;
}

/** Every guide slug, in reading order. */
const DOCS_GUIDE_SLUGS: readonly string[] = DOCS_SECTIONS.flatMap((section) =>
  section.items.flatMap((item) => (item.kind === "guide" ? [item.slug] : [])),
);

interface PagerLink {
  title: string;
  href: string;
}

/** The pages a reader walks through (the console opens elsewhere). */
const READING_ORDER: readonly PagerLink[] = DOCS_SECTIONS.flatMap((section) =>
  section.items.flatMap((item) =>
    item.kind === "console" ? [] : [{ title: item.title, href: hrefOf(item) }],
  ),
);

function adjacentPages(href: string): {
  previous?: PagerLink;
  next?: PagerLink;
} {
  const index = READING_ORDER.findIndex((page) => page.href === href);

  if (index === -1) return {};

  return {
    previous: READING_ORDER[index - 1],
    next: READING_ORDER[index + 1],
  };
}

export {
  API_DOCS_PATH,
  DOCS_CONSOLE_PATH,
  DOCS_DESKTOP_QUERY,
  DOCS_GUIDE_SLUGS,
  DOCS_INDEX_SLUG,
  DOCS_REFERENCE_PATH,
  DOCS_SECTIONS,
  READING_ORDER,
  adjacentPages,
  docsGuideHref,
  hrefOf,
};
export type { DocsNavItem, DocsSection, PagerLink };
