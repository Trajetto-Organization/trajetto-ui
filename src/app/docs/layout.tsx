import type { ReactNode } from "react";

import { DocumentLink } from "@/components/shared/document-link";

import { LEGAL_DOCUMENTS, legalPath } from "@/lib/content/legal-documents";

import { DocsHeader } from "./_components/docs-header";
import { DocsSidebarNav } from "./_components/docs-sidebar-nav";

/**
 * The developer portal (decision 11.1): public, in Portuguese, outside the
 * logged-in area. The middleware gates only the private prefixes, so anyone
 * integrating — often the ERP vendor, with no Trajetto login — can read it.
 *
 * On the public site's frame (decision 16): `site-root` gives the site tokens,
 * Inter and the theme fade; the header follows the site header.
 */
const DocsLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <div className="site-root flex min-h-screen flex-1 flex-col">
    <a
      href="#conteudo"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-[12px] focus:bg-site-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-site-pop"
    >
      Pular para o conteúdo
    </a>

    <DocsHeader />

    <div className="mx-auto flex w-full max-w-[90rem] flex-1 px-[clamp(16px,3vw,24px)]">
      {/* Named: the only complementary landmark of the page (axe landmark-unique). */}
      <aside
        aria-label="Menu da documentação"
        className="sticky top-[70px] hidden h-[calc(100vh-70px)] w-60 shrink-0 overflow-y-auto overscroll-contain border-r border-site-line py-8 pr-4 min-[960px]:block"
      >
        <DocsSidebarNav />
      </aside>

      <main id="conteudo" className="min-w-0 flex-1">
        {children}
      </main>
    </div>

    <footer className="border-t border-site-line">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-3 px-[clamp(16px,3vw,24px)] py-6 text-[13px] text-site-muted sm:flex-row sm:items-center sm:justify-between">
        <p>Trajetto · API de Integração, versão v1</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {LEGAL_DOCUMENTS.map((doc) => (
            <li key={doc.slug}>
              <DocumentLink
                href={legalPath(doc.slug)}
                className="rounded-sm outline-none transition-colors duration-200 hover:text-site-ink focus-visible:ring-2 focus-visible:ring-site-ink/40"
              >
                {doc.label}
              </DocumentLink>
            </li>
          ))}
          <li>
            <DocumentLink
              href="/contato"
              className="rounded-sm outline-none transition-colors duration-200 hover:text-site-ink focus-visible:ring-2 focus-visible:ring-site-ink/40"
            >
              Contato
            </DocumentLink>
          </li>
        </ul>
      </div>
    </footer>
  </div>
);

export default DocsLayout;
