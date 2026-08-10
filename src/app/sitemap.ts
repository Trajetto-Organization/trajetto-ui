import { MetadataRoute } from "next";

import { sanityFetch } from "@/sanity/fetch";
import { BLOG_SITEMAP_QUERY, LEGAL_SITEMAP_QUERY } from "@/sanity/queries";

interface SitemapPost {
  slug: string;
  lastModified?: string;
  featured?: boolean;
}

interface SitemapPolicy {
  slug: string;
  lastModified?: string;
}

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const baseUrl = process.env.METADATA_BASE as string;
  const currentDate = new Date().toISOString();

  // Static URLs with optimized SEO priorities
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 1.0, // Homepage - top priority
    },
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/forgot`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 1.0, // About - high priority for conversion
    },
    {
      url: `${baseUrl}/quote`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 1.0, // Budget - very high priority (conversion)
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 1.0, // Contact - important for conversion
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: currentDate,
      changeFrequency: "weekly", // Updates frequently with new posts
      priority: 1.0, // Content Hub - Critical for SEO
    },
  ];

  // Blog Posts URLs - Sanity Dynamic. `sanityFetch` já trata projeto não
  // configurado e falha de rede devolvendo `null`, então o sitemap continua
  // saindo com as rotas estáticas em vez de quebrar.
  const posts = await sanityFetch<SitemapPost[]>(
    BLOG_SITEMAP_QUERY,
    {},
    { tags: ["blog"], revalidate: 86400 },
  );

  const blogRoutes: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.lastModified || currentDate,
    changeFrequency: "monthly" as const,
    // Featured posts have higher priority
    priority: post.featured ? 1.0 : 0.9,
  }));

  // Legal Policy URLs - Sanity Dynamic
  const policies = await sanityFetch<SitemapPolicy[]>(
    LEGAL_SITEMAP_QUERY,
    {},
    { tags: ["legal"], revalidate: 86400 },
  );

  const legalRoutes: MetadataRoute.Sitemap = (policies ?? []).map((policy) => ({
    url: `${baseUrl}/legal/${policy.slug}`,
    lastModified: policy.lastModified || currentDate,
    changeFrequency: "yearly" as const,
    priority: 0.3, // Low priority, but necessary for compliance
  }));

  // Combine all routes
  const allRoutes = [...staticRoutes, ...blogRoutes, ...legalRoutes];

  // Sort by priority and modification date
  return allRoutes.sort((a, b) => {
    // First by priority (largest first)
    const priorityDiff = (b.priority || 0) - (a.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;

    // Then by modification date (most recent first)
    return (
      new Date(b.lastModified as string).getTime() -
      new Date(a.lastModified as string).getTime()
    );
  });
};

export default sitemap;
