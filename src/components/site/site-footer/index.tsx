import { Instagram, Linkedin, Twitter } from "lucide-react";

import { DocumentLink } from "@/components/shared/document-link";
import { LEGAL_DOCUMENTS, legalPath } from "@/lib/content/legal-documents";
import { FOOTER_SECTIONS } from "@/lib/public-pages";
import { siteConfig } from "@/lib/site";

import { SiteLogo } from "../site-logo";
import { CopyrightYear } from "./copyright-year";

/**
 * The public footer (design: Trajetto Rodape). A server component; links go
 * through DocumentLink, so /docs and /login load as full documents (the
 * per-request CSP) and the prerendered pages keep next/link.
 */

const SOCIAL_ICONS = {
  linkedin: Linkedin,
  instagram: Instagram,
  x: Twitter,
} as const;

// The same profiles the home page's JSON-LD lists as sameAs (src/lib/site.ts).
const SOCIAL_LINKS = siteConfig.socialProfiles.map((profile) => ({
  label: profile.label,
  href: profile.href,
  icon: SOCIAL_ICONS[profile.network],
}));

/** Short labels for the bottom row; the column above uses the full names. */
const LEGAL_SHORT_LABELS: Record<string, string> = {
  termos: "Termos",
  privacidade: "Privacidade",
  cookies: "Cookies",
};

const linkClass =
  "rounded-[4px] text-site-muted outline-none transition-colors duration-200 hover:text-site-ink focus-visible:text-site-ink focus-visible:ring-2 focus-visible:ring-site-ink/40";

const SiteFooter = (): JSX.Element => {
  // The year where the page is rendered (build time for prerendered pages);
  // CopyrightYear moves it to the visitor's current year.
  const renderedYear = new Date().getFullYear();

  return (
    <footer className="px-[clamp(20px,4vw,40px)] pb-8 pt-[clamp(48px,6vw,72px)] font-site text-site-ink">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-9">
          <div className="flex min-w-0 flex-col gap-3.5 min-[480px]:min-w-[220px]">
            <SiteLogo className="self-start" priority={false} />
            <p className="m-0 max-w-[260px] text-sm leading-normal text-site-muted">
              Gestão de frotas e de entregas em uma única plataforma.
            </p>
            <ul className="flex gap-1">
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <a
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex size-[38px] items-center justify-center rounded-[10px] outline-none transition-colors duration-200 hover:bg-site-soft2 focus-visible:ring-2 focus-visible:ring-site-ink/40 [@media(pointer:coarse)]:size-11"
                  >
                    <Icon aria-hidden className="size-[17px]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <nav
              key={section.title}
              aria-label={section.title}
              className="text-sm leading-normal"
            >
              <p className="mb-1 mt-0 font-semibold">{section.title}</p>
              <ul className="mt-2.5 flex flex-col gap-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <DocumentLink href={link.href} className={linkClass}>
                      {link.label}
                    </DocumentLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap justify-between gap-3 border-t border-site-line pt-6 text-[13px] text-site-muted">
          <p className="m-0">
            © <CopyrightYear initialYear={renderedYear} /> Trajetto. Todos os
            direitos reservados.
          </p>
          <ul className="flex gap-4">
            {LEGAL_DOCUMENTS.map((doc) => (
              <li key={doc.slug}>
                <DocumentLink href={legalPath(doc.slug)} className={linkClass}>
                  {LEGAL_SHORT_LABELS[doc.slug] ?? doc.label}
                </DocumentLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
};

export { SiteFooter };
