import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import {
  calendarDay,
  ContentError,
  parseFrontmatter,
  readFrontmatter,
  SLUG_PATTERN,
} from "@/lib/content/frontmatter";
import {
  renderMdx,
  type MdxComponents,
  type RenderedMdx,
} from "@/lib/content/mdx";
import { MAX_PAGE_TITLE_LENGTH } from "@/lib/site";

import {
  DOCS_GUIDE_SLUGS,
  DOCS_REFERENCE_PATH,
  docsGuideHref,
} from "./navigation";

/**
 * The portal's guides, from `src/content/docs/<slug>.mdx`, through the same
 * MDX pipeline and body rules as the blog and the legal pages. Uses `fs`:
 * server only.
 */

const DOCS_DIR = path.join(process.cwd(), "src", "content", "docs");

const docsFrontmatterSchema = z
  .object({
    // The page <title>, before the layout appends the brand.
    title: z.string().trim().min(5).max(MAX_PAGE_TITLE_LENGTH),
    description: z.string().trim().min(30).max(200),
    slug: z.string().regex(SLUG_PATTERN, "use kebab-case sem acentos"),
    updatedAt: calendarDay,
  })
  .strict();

interface DocsGuide {
  slug: string;
  title: string;
  description: string;
  /** Last revision, YYYY-MM-DD. */
  updatedAt: string;
  body: string;
  file: string;
}

function parseGuide(file: string, raw: string): DocsGuide {
  const { data, body } = readFrontmatter(file, raw);
  const frontmatter = parseFrontmatter(docsFrontmatterSchema, data, file);

  return { ...frontmatter, body, file };
}

let cache: DocsGuide[] | null = null;

/** Every registered guide, in reading order; fails on a file off the menu. */
function loadGuides(): DocsGuide[] {
  if (cache && process.env.NODE_ENV === "production") return cache;

  const files = fs.existsSync(DOCS_DIR)
    ? fs.readdirSync(DOCS_DIR).filter((file) => file.endsWith(".mdx"))
    : [];

  const guides = files.map((file) =>
    parseGuide(file, fs.readFileSync(path.join(DOCS_DIR, file), "utf8")),
  );

  for (const guide of guides) {
    if (!DOCS_GUIDE_SLUGS.includes(guide.slug)) {
      throw new ContentError(
        guide.file,
        "guia fora do menu; inclua o slug em src/app/docs/_lib/navigation.ts.",
      );
    }
  }

  for (const slug of DOCS_GUIDE_SLUGS) {
    if (!guides.some((guide) => guide.slug === slug)) {
      throw new ContentError(`${slug}.mdx`, "guia no menu sem arquivo.");
    }
  }

  cache = DOCS_GUIDE_SLUGS.map((slug) =>
    guides.find((guide) => guide.slug === slug)!,
  );

  return cache;
}

function getGuide(slug: string): DocsGuide | null {
  return loadGuides().find((guide) => guide.slug === slug) ?? null;
}

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

interface DocsSitemapPage {
  path: string;
  /** YYYY-MM-DD; absent where there is no real content date. */
  updatedAt?: string;
}

/**
 * The portal's indexable pages, for the site's sitemap: each guide with its
 * own revision day, the reference without one (it follows the live API, and
 * a lastmod that always says "today" teaches Google to ignore it). The
 * console only redirects to the API, so it is left out.
 */
function docsSitemapPages(): DocsSitemapPage[] {
  return [
    ...loadGuides().map((guide) => ({
      path: docsGuideHref(guide.slug),
      updatedAt: guide.updatedAt,
    })),
    { path: DOCS_REFERENCE_PATH },
  ];
}

export {
  DOCS_DIR,
  docsFrontmatterSchema,
  docsSitemapPages,
  getGuide,
  loadGuides,
  parseGuide,
  renderGuide,
};
export type { DocsGuide, DocsSitemapPage };
