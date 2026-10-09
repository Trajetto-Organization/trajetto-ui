import { MetadataRoute } from "next";

import { getPosts } from "@/lib/content/blog";
import { getLegalDocuments } from "@/lib/content/legal";
import { PUBLIC_PAGES } from "@/lib/public-pages";
import { absoluteUrl } from "@/lib/site";

/** Calendar day → Date at UTC midnight, the way lastmod is read. */
function day(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

/**
 * Every public URL worth ranking, with real dates only: Google stops
 * trusting lastmod on a site that always reports "today", so pages without
 * a content date simply omit it. Drafts never appear (they 404 in a build).
 */
const sitemap = (): MetadataRoute.Sitemap => {
  const posts = getPosts();
  const latestPost = posts.reduce<string | null>((latest, post) => {
    const changed = post.updated ?? post.date;
    return !latest || changed > latest ? changed : latest;
  }, null);

  const pages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    ...(page.path === "/blog" && latestPost
      ? { lastModified: day(latestPost) }
      : {}),
  }));

  const blog: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: day(post.updated ?? post.date),
    changeFrequency: "monthly",
    priority: post.featured ? 0.8 : 0.7,
  }));

  const legal: MetadataRoute.Sitemap = getLegalDocuments().map((doc) => ({
    url: absoluteUrl(`/legal/${doc.slug}`),
    lastModified: day(doc.updatedAt),
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  return [...pages, ...blog, ...legal];
};

export default sitemap;
