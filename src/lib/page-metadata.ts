import type { Metadata } from "next";

import { siteConfig } from "@/lib/site";

/**
 * Metadata of a public page, built one way everywhere.
 *
 * Each page owns its canonical: the root layout declares none, because a
 * canonical there is inherited by every page that forgets its own and points
 * them all at the home page. Paths stay relative and resolve against the
 * layout's `metadataBase`.
 */
interface ArticleMetadata {
  publishedTime: string;
  modifiedTime?: string;
  authors?: string[];
  section?: string;
  tags?: string[];
}

interface PageMetadataInput {
  /** Root-relative path, e.g. "/sobre". */
  path: string;
  /** Short title; the layout template appends " | Trajetto". */
  title: string;
  description: string;
  keywords?: string[];
  type?: "website" | "article";
  /** Title for social cards, where no template applies. */
  socialTitle?: string;
  noindex?: boolean;
  /**
   * `false` leaves the card image to a file-based `opengraph-image`. Next
   * only merges that file when the page's openGraph has no `images` key at
   * all, so the key is omitted rather than set to undefined.
   */
  defaultImage?: boolean;
  article?: ArticleMetadata;
}

const DEFAULT_IMAGE = {
  url: "/og-default.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
};

export function buildPageMetadata({
  path,
  title,
  description,
  keywords,
  type = "website",
  socialTitle,
  noindex = false,
  defaultImage = true,
  article,
}: PageMetadataInput): Metadata {
  const cardTitle = socialTitle ?? `${title} | ${siteConfig.name}`;
  const image = { ...DEFAULT_IMAGE, alt: cardTitle };

  const openGraph: NonNullable<Metadata["openGraph"]> = {
    title: cardTitle,
    description,
    url: path,
    siteName: siteConfig.name,
    locale: siteConfig.ogLocale,
    ...(type === "article" && article
      ? {
          type: "article" as const,
          publishedTime: article.publishedTime,
          modifiedTime: article.modifiedTime ?? article.publishedTime,
          authors: article.authors,
          section: article.section,
          tags: article.tags,
        }
      : { type: "website" as const }),
    ...(defaultImage ? { images: [image] } : {}),
  };

  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: { canonical: path },
    // Next replaces the layout's whole robots block with the page's, so an
    // indexable page keeps none of its own: it inherits the googleBot
    // directives (large image preview, full snippets) from the layout.
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph,
    twitter: {
      card: "summary_large_image",
      title: cardTitle,
      description,
      ...(defaultImage ? { images: [DEFAULT_IMAGE.url] } : {}),
    },
  };
}
