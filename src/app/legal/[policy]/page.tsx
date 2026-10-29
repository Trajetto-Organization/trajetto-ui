import { Metadata } from "next";
import { notFound } from "next/navigation";

import Link from "next/link";

import { LEGAL_DOC_ICONS } from "@/components/legal/legal-docs";
import { LegalIdentity } from "@/components/legal/legal-identity";
import { legalMdxComponents } from "@/components/legal/legal-prose";
import { LegalSwitcher } from "@/components/legal/legal-switcher";
import { MovingArrow } from "@/components/site/arrow-link";
import { MobileToc } from "@/components/site/editorial/mobile-toc";
import { ReadingProgress } from "@/components/site/editorial/reading-progress";
import { EditorialToc } from "@/components/site/editorial/toc";
import { SiteShell } from "@/components/site/site-shell";

import { editorialDate } from "@/components/site/editorial/date";
import { getLegalDocument, getLegalDocuments } from "@/lib/content/legal";
import { legalPath, type LegalSlug } from "@/lib/content/legal-documents";
import { renderMdx } from "@/lib/content/mdx";
import { buildPageMetadata } from "@/lib/page-metadata";

interface LegalPolicyPageProps {
  params: { policy: string };
}

// Only the registered documents exist: anything else is a real 404, not a
// "not found" drawn on a 200 page.
export const dynamicParams = false;

export function generateStaticParams(): Array<{ policy: string }> {
  return getLegalDocuments().map((doc) => ({ policy: doc.slug }));
}

export function generateMetadata({ params }: LegalPolicyPageProps): Metadata {
  const doc = getLegalDocument(params.policy);

  if (!doc) {
    return { title: "Página não encontrada", robots: { index: false } };
  }

  return buildPageMetadata({
    path: legalPath(doc.slug as LegalSlug),
    title: doc.title,
    description: doc.description,
    type: "article",
    noindex: doc.draft,
    article: { publishedTime: doc.effectiveAt, modifiedTime: doc.updatedAt },
  });
}

/** The prose element: the reading bar and the TOC's percentage measure it. */
const PROSE_ID = "legal-texto";

const LegalPolicyPage = async ({
  params,
}: LegalPolicyPageProps): Promise<JSX.Element> => {
  const doc = getLegalDocument(params.policy);

  if (!doc) notFound();

  const { Content, toc } = await renderMdx(doc.body, {
    file: doc.file,
    components: legalMdxComponents,
  });
  const documents = getLegalDocuments();
  const others = documents.filter((item) => item.slug !== doc.slug);
  // The clauses: the sidebar lists the h2s only.
  const clauses = toc.filter((item) => item.level === 2);

  return (
    <SiteShell>
      <main>
        <ReadingProgress targetId={PROSE_ID} tone="ink" />

        <header className="relative overflow-hidden px-[clamp(20px,4vw,40px)] pb-[clamp(36px,5vw,52px)] pt-[clamp(116px,14vh,150px)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_50%_at_15%_0%,var(--site-glow-a),transparent_70%),radial-gradient(35%_45%_at_90%_20%,var(--site-glow-b),transparent_70%)]"
          />
          <div className="relative mx-auto flex max-w-[1160px] flex-col gap-7">
            <LegalSwitcher
              documents={documents.map(({ slug, label }) => ({ slug, label }))}
              current={doc.slug}
            />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-end gap-x-14 gap-y-5">
              <h1 className="m-0 animate-[tpIn_.6s_cubic-bezier(.22,1,.36,1)_both] font-site-display text-[clamp(44px,6.2vw,84px)] font-medium leading-[.98] tracking-[-.045em] [text-wrap:balance]">
                {doc.title}
              </h1>
              <div className="flex animate-[tpIn_.6s_cubic-bezier(.22,1,.36,1)_.06s_both] flex-col gap-4">
                <p className="m-0 max-w-[520px] text-[17px] leading-[1.6] text-site-muted [text-wrap:pretty]">
                  {doc.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-site-line2 bg-site-surface px-3 py-[7px] text-[13px]">
                    <span
                      aria-hidden
                      className="size-[7px] rounded-full bg-[#10b981]"
                    />
                    <span>
                      Atualizado em{" "}
                      <time dateTime={doc.updatedAt}>
                        {editorialDate(doc.updatedAt)}
                      </time>
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-site-line2 px-3 py-[7px] text-[13px] text-site-muted">
                    <span>
                      Vigente desde{" "}
                      <time dateTime={doc.effectiveAt}>
                        {editorialDate(doc.effectiveAt)}
                      </time>
                    </span>
                  </span>
                </div>
                {doc.draft ? (
                  <p className="m-0 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                    Rascunho: visível só no ambiente de desenvolvimento.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <div className="px-[clamp(20px,4vw,40px)] pb-[clamp(56px,8vw,96px)]">
          <div className="mx-auto grid max-w-[1160px] grid-cols-[minmax(0,1fr)] items-start gap-[clamp(32px,5vw,72px)] border-t border-site-line pt-[clamp(28px,4vw,44px)] min-[1060px]:grid-cols-[250px_minmax(0,1fr)]">
            <EditorialToc
              items={clauses}
              variant="legal"
              targetId={PROSE_ID}
              className="hidden min-[1060px]:flex"
            />

            {/* The legal pages' accent is the ink: bullets and link underlines. */}
            <div className="w-full min-w-0 max-w-[760px] justify-self-center [--acc:var(--site-ink)]">
              <LegalIdentity />

              <MobileToc
                items={clauses}
                title="SEÇÕES"
                className="min-[1060px]:hidden"
              />

              <div id={PROSE_ID}>
                <Content />
              </div>

              {others.length > 0 ? (
                <nav
                  aria-label="Outros documentos legais"
                  className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3"
                >
                  {others.map((item) => {
                    const Icon = LEGAL_DOC_ICONS[item.slug];

                    return (
                      <Link
                        key={item.slug}
                        href={legalPath(item.slug as LegalSlug)}
                        className="group/arrow flex items-center gap-3.5 rounded-[18px] border border-site-line bg-site-surface px-5 py-[18px] outline-none transition-[transform,border-color] [transition-duration:350ms] ease-site hover:-translate-y-[3px] hover:border-site-line2 focus-visible:ring-2 focus-visible:ring-site-ink/40 motion-reduce:hover:translate-y-0"
                      >
                        <span
                          aria-hidden
                          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-site-soft2"
                        >
                          {Icon ? <Icon className="size-[18px]" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] text-site-muted">
                            Leia também
                          </span>
                          <span className="block text-[15px] font-semibold">
                            {item.label}
                          </span>
                        </span>
                        <MovingArrow size={17} />
                      </Link>
                    );
                  })}
                </nav>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </SiteShell>
  );
};

export default LegalPolicyPage;
