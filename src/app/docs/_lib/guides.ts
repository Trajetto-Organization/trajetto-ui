import {
  renderMdx,
  type MdxComponents,
  type RenderedMdx,
} from "@/lib/content/mdx";

import { type DocsGuide } from "./guide-index";

/**
 * The portal's guides, rendered through the same MDX pipeline and body rules
 * as the blog and the legal pages. Reading them lives in guide-index.ts, which
 * the sitemap imports without the compiler. Server only.
 */

const compiled = new Map<string, Promise<RenderedMdx>>();

/**
 * The compiled guide. Kept per process in production: the files cannot
 * change without a new build, and the pages render per request (they read
 * the live document), so compiling on every visit would be pure waste.
 */
function renderGuide(
  guide: DocsGuide,
  components: MdxComponents,
): Promise<RenderedMdx> {
  if (process.env.NODE_ENV !== "production") {
    return renderMdx(guide.body, { file: guide.file, components });
  }

  let rendered = compiled.get(guide.slug);

  if (!rendered) {
    rendered = renderMdx(guide.body, { file: guide.file, components });
    compiled.set(guide.slug, rendered);
    // A failed compile is not cached: the next request tries again.
    rendered.catch(() => compiled.delete(guide.slug));
  }

  return rendered;
}

export {
  DOCS_DIR,
  docsFrontmatterSchema,
  docsSitemapPages,
  getGuide,
  loadGuides,
  parseGuide,
} from "./guide-index";
export type { DocsGuide, DocsSitemapPage } from "./guide-index";
export { renderGuide };
