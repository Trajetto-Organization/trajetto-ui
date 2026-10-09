/**
 * Shapes of the site's MDX content (blog and legal pages).
 *
 * Client-safe on purpose: the blog explorer receives `PostMeta` as props, so
 * nothing here may pull `fs` or the MDX compiler into a browser bundle.
 */

export type BlogCategoryIcon =
  "delivery" | "fleet" | "route" | "plug" | "shield";

export interface BlogCategory {
  slug: string;
  title: string;
  description: string;
  /** Hex color for the card gradient and the badge; the name's color in light. */
  color: string;
  /**
   * The name's color in the dark theme. The light hexes read 2.9–3.3:1 on
   * the dark card, under the 4.5:1 of WCAG AA for 12px text.
   */
  darkColor: string;
  icon: BlogCategoryIcon;
}

export interface BlogCategoryWithCount extends BlogCategory {
  count: number;
}

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface PostSeo {
  title?: string;
  description?: string;
  keywords: string[];
}

/** Everything about a post except its body: safe to send to the client. */
export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  /** Calendar day, YYYY-MM-DD. */
  date: string;
  updated?: string;
  category: BlogCategory;
  tags: string[];
  author: string;
  featured: boolean;
  draft: boolean;
  /** Minutes. */
  readingTime: number;
  seo: PostSeo;
}

export interface Post extends PostMeta {
  /** Raw MDX without the frontmatter. */
  body: string;
  file: string;
}

export interface LegalDocumentMeta {
  slug: string;
  /** Short name used by the pill navigation and the footer. */
  label: string;
  title: string;
  description: string;
  /** Last revision of the text, YYYY-MM-DD. */
  updatedAt: string;
  /** When the text starts to apply, YYYY-MM-DD. */
  effectiveAt: string;
  draft: boolean;
}

export interface LegalDocument extends LegalDocumentMeta {
  body: string;
  file: string;
}
