import { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";

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
      priority: 0.9, // About - high priority for conversion
    },
    {
      url: `${baseUrl}/quote`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.95, // Budget - very high priority (conversion)
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8, // Contact - important for conversion
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: currentDate,
      changeFrequency: "weekly", // Updates frequently with new posts
      priority: 0.9, // Content Hub - Critical for SEO
    },
  ];

  // Blog Posts URLs - Sanity Dynamic
  let blogRoutes: MetadataRoute.Sitemap = [];

  try {
    // Query to search all published posts
    const posts = await client.fetch(
      `*[_type == "blogPost" && !(_id in path("drafts.**"))] {
        "slug": slug.current,
        "lastModified": coalesce(publishedAt, _updatedAt, _createdAt),
        "publishedAt": publishedAt,
        "featured": featured
      }`,
      {},
      {
        cache: "force-cache",
        next: {
          tags: ["blog-posts"],
          revalidate: 86400, // Revalidates once a day
        },
      },
    );

    blogRoutes = posts.map((post: any) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.lastModified || currentDate,
      changeFrequency: "monthly" as const,
      // Featured posts have higher priority
      priority: post.featured ? 0.9 : 0.8,
    }));
  } catch (error) {
    console.log("Erro ao carregar posts do blog para sitemap:", error);
    // Continue without blog posts if there is an error
  }

  // Legal Policy URLs - Sanity Dynamic
  let legalRoutes: MetadataRoute.Sitemap = [];

  try {
    // Query to search for legal policies
    const policies = await client.fetch(
      `*[_type == "legalPolicy"] {
        "slug": slug.current,
        "lastModified": coalesce(_updatedAt, _createdAt)
      }`,
      {},
      {
        cache: "force-cache",
        next: {
          tags: ["legal-policies"],
          revalidate: 86400, // Revalidates once a day
        },
      },
    );

    legalRoutes = policies.map((policy: any) => ({
      url: `${baseUrl}/legal/${policy.slug}`,
      lastModified: policy.lastModified || currentDate,
      changeFrequency: "yearly" as const,
      priority: 0.3, // Low priority, but necessary for compliance
    }));
  } catch (error) {
    console.log("Erro ao carregar políticas legais para sitemap:", error);
    // Continue without policies if error occurs
  }

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
