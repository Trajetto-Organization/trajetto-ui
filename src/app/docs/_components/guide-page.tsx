import { ChevronDown, ListTree } from "lucide-react";

import { Eyebrow } from "@/components/site/primitives";

import { formatContentDate } from "@/lib/content/format";

import { renderGuide, type DocsGuide } from "../_lib/guides";
import { DOCS_SECTIONS, docsGuideHref } from "../_lib/navigation";

import { docsMdxComponents } from "./docs-mdx";
import { DOCS_LEAD, DOCS_TITLE } from "./docs-type";
import { DocsPager } from "./docs-pager";
import { DocsToc } from "./docs-toc";

function sectionOf(slug: string): string | undefined {
  return DOCS_SECTIONS.find((section) =>
    section.items.some((item) => item.kind === "guide" && item.slug === slug),
  )?.title;
}

/** A guide: its header, the body, the pager and "Nesta página". */
const GuidePage = async ({ guide }: { guide: DocsGuide }) => {
  const { Content, toc } = await renderGuide(guide, docsMdxComponents);
  const section = sectionOf(guide.slug);

  return (
    <div className="flex gap-10">
      {/* The portal's accent is the deliveries pink: bullets, link underlines. */}
      <article className="min-w-0 flex-1 py-10 [--acc:var(--site-pink)] min-[960px]:pl-10 xl:max-w-3xl">
        <header className="mb-10 border-b border-site-line pb-8">
          {section ? (
            <Eyebrow className="mb-4 uppercase">{section}</Eyebrow>
          ) : null}
          <h1 className={DOCS_TITLE}>{guide.title}</h1>
          <p className={DOCS_LEAD}>{guide.description}</p>
        </header>

        {toc.length > 0 ? (
          <details className="group mb-10 rounded-[18px] border border-site-line bg-site-surface xl:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[18px] px-5 py-3.5 font-site-mono text-[11.5px] font-medium tracking-[.14em] text-site-muted outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40 [&::-webkit-details-marker]:hidden">
              <ListTree className="size-4 text-site-ink" aria-hidden />
              NESTA PÁGINA
              <ChevronDown
                className="ml-auto size-4 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="border-t border-site-line px-5 py-3">
              <DocsToc items={toc} />
            </div>
          </details>
        ) : null}

        <div className="min-w-0">
          <Content />
        </div>

        <p className="mt-12 text-[13px] text-site-muted">
          Atualizado em{" "}
          <time dateTime={guide.updatedAt}>
            {formatContentDate(guide.updatedAt)}
          </time>
          .
        </p>

        <DocsPager href={docsGuideHref(guide.slug)} />
      </article>

      {/* A plain column, not an <aside>: inside <main> a second complementary
          landmark repeated the sidebar's (axe landmark-unique); the nav
          inside already names it "Nesta página". */}
      <div className="sticky top-[70px] hidden h-[calc(100vh-70px)] w-56 shrink-0 overflow-y-auto overscroll-contain py-10 xl:block">
        <DocsToc items={toc} />
      </div>
    </div>
  );
};

export { GuidePage, sectionOf };
