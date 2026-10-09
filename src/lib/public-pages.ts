import type { MetadataRoute } from "next";

import { LEGAL_DOCUMENTS, legalPath } from "@/lib/content/legal-documents";

/**
 * The public site's pages, in one list: the sitemap, the navbar and the
 * footer read it, so a page added here shows up in all three and none of
 * them can point at a page that does not exist.
 *
 * Login and password recovery are not here on purpose: they carry noindex
 * and have nothing to rank for.
 */
export interface PublicPage {
  path: string;
  label: string;
  priority: number;
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]["changeFrequency"]
  >;
  /** Top navigation: a plain link, or an entry of the "Produtos" menu. */
  nav?: "link" | "produto";
  /** One line under the label in the "Produtos" menu. */
  summary?: string;
  /** Footer column. */
  footer?: "produtos" | "institucional";
}

export const PUBLIC_PAGES: readonly PublicPage[] = [
  { path: "/", label: "Início", priority: 1, changeFrequency: "monthly" },
  {
    path: "/gestao-de-frotas",
    label: "Gestão de Frotas",
    summary: "Veículos, abastecimento, checklist, manutenção e custos.",
    priority: 0.9,
    changeFrequency: "monthly",
    nav: "produto",
    footer: "produtos",
  },
  {
    path: "/gestao-de-entregas",
    label: "Gestão de Entregas",
    summary: "Rotas, torre de controle e comprovante digital.",
    priority: 0.9,
    changeFrequency: "monthly",
    nav: "produto",
    footer: "produtos",
  },
  {
    path: "/app-do-motorista",
    label: "App do motorista",
    summary: "O aplicativo Android das duas operações.",
    priority: 0.8,
    changeFrequency: "monthly",
    nav: "produto",
    footer: "produtos",
  },
  {
    // The developer portal (decision 11.1): public, for whoever evaluates or
    // builds an integration, with or without an account.
    path: "/docs",
    label: "Documentação da API",
    priority: 0.6,
    changeFrequency: "monthly",
    footer: "produtos",
  },
  {
    path: "/blog",
    label: "Blog",
    priority: 0.8,
    changeFrequency: "weekly",
    nav: "link",
    footer: "institucional",
  },
  {
    path: "/sobre",
    label: "Sobre nós",
    priority: 0.7,
    changeFrequency: "monthly",
    nav: "link",
    footer: "institucional",
  },
  {
    path: "/contato",
    label: "Contato",
    priority: 0.6,
    changeFrequency: "yearly",
    nav: "link",
    footer: "institucional",
  },
  {
    path: "/orcamento",
    label: "Solicitar orçamento",
    priority: 0.8,
    changeFrequency: "yearly",
    footer: "institucional",
  },
];

export interface NavLink {
  label: string;
  href: string;
  summary?: string;
}

function linkOf(page: PublicPage): NavLink {
  return { label: page.label, href: page.path, summary: page.summary };
}

/**
 * The "Produtos" menu: both product pages, then the driver app page, which
 * both modules share.
 */
export const PUBLIC_PRODUCT_LINKS: readonly NavLink[] = PUBLIC_PAGES.filter(
  (page) => page.nav === "produto",
).map(linkOf);

/** Plain links of the top navigation, after the "Produtos" menu. */
export const PUBLIC_NAV_LINKS: readonly NavLink[] = PUBLIC_PAGES.filter(
  (page) => page.nav === "link",
).map(linkOf);

export const FOOTER_SECTIONS: readonly { title: string; links: NavLink[] }[] = [
  {
    title: "Produtos",
    links: PUBLIC_PAGES.filter((page) => page.footer === "produtos").map(
      linkOf,
    ),
  },
  {
    title: "Institucional",
    links: PUBLIC_PAGES.filter((page) => page.footer === "institucional").map(
      linkOf,
    ),
  },
  {
    title: "Legal",
    links: LEGAL_DOCUMENTS.map((doc) => ({
      label: doc.label,
      href: legalPath(doc.slug),
    })),
  },
];

/** Where the platform starts; the middleware sends a signed-in user on. */
export const PLATFORM_ENTRY = { label: "Acessar plataforma", href: "/login" };
