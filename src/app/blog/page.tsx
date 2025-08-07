import { Metadata } from "next";
import { client } from "@/sanity/lib/client";

import imageUrlBuilder from "@sanity/image-url";
import { SanityImageSource } from "@sanity/image-url/lib/types/types";

import { BlogTitleSubtitle } from "@/components/blog/blog-title-subtitle";
import { BlogSearch } from "@/components/blog/blog-search";

import { BlogPostsGrid } from "@/components/blog/blog-posts-grid";
import { BlogPagination } from "@/components/blog/blog-pagination";

import { BlogEmptyState } from "@/components/blog/blog-empty-state";
import { Separator } from "@/components/ui/separator";

const POSTS_PER_PAGE = 12;

// HYBRID CACHE CONFIGURATION
const CACHE_CONFIG = {
  // Primary strategy: Caching with webhook + temporal fallback
  primary: {
    cache: "force-cache" as const,
    revalidate: process.env.NODE_ENV === "production" ? 86400 : 300, // Revalidates once a day in prod, 5min dev
    tags: ["blog-posts", "blog-categories"],
  },
  fallback: {
    cache: "force-cache" as const,
    revalidate: 86400, // Revalidates once a day
    tags: ["blog-fallback"],
  },
};

const log = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `🔄 [BLOG] ${message}`,
        data ? JSON.stringify(data, null, 2) : "",
      );
    }
  },
  error: (message: string, error?: any) => {
    console.error(`❌ [BLOG] ${message}`, error);
  },
  success: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `✅ [BLOG] ${message}`,
        data ? JSON.stringify(data, null, 2) : "",
      );
    }
  },
};

// Image builder configuration
const { projectId, dataset } = client.config();
const urlFor = (source: SanityImageSource) =>
  projectId && dataset
    ? imageUrlBuilder({ projectId, dataset }).image(source)
    : null;

interface BlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  featuredImage?: any;
  publishedAt?: string;
  readTime?: number;
  _createdAt: string;
  author?: {
    name: string;
    slug: { current: string };
  };
  category?: {
    title: string;
    slug: { current: string };
    color: string;
  };
}

interface Category {
  title: string;
  slug: { current: string };
  color: string;
  count: number;
}

interface BlogPageProps {
  searchParams: {
    page?: string;
    q?: string;
    category?: string;
  };
}

export const metadata: Metadata = {
  title: "Blog",
  description: `
    Descubra estratégias, dicas e insights para otimizar a gestão da sua frota. 
    Blog oficial da Trajetto com conteúdo especializado em gestão de frotas, 
    logística, manutenção preventiva e redução de custos operacionais.
  `.trim(),
  keywords: [
    "blog trajetto",
    "gestão de frotas",
    "logística",
    "tecnologia automotiva",
    "otimização de frotas",
    "manutenção preventiva",
    "rastreamento veicular",
    "dicas frotas",
    "economia combustível",
    "gestão motoristas",
    "relatórios frotas",
    "tendências logística",
    "inovação transporte",
    "sustentabilidade frotas",
    "compliance veicular",
  ],
  alternates: {
    canonical: `${process.env.METADATA_BASE}/blog`,
  },
  openGraph: {
    title: "Blog - Trajetto | Insights sobre Gestão de Frotas",
    description: `
      Descubra estratégias, dicas e insights para otimizar a gestão da sua frota. 
      Conteúdo especializado em logística e gestão de frotas.
    `.trim(),
    url: `${process.env.METADATA_BASE}/blog`,
    type: "website",
    locale: "pt_BR",
    images: [
      {
        url: `${process.env.METADATA_BASE}/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: "Blog Trajetto - Insights sobre Gestão de Frotas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | Insights sobre Gestão de Frotas",
    description: `
      Descubra estratégias, dicas e insights para otimizar a gestão da sua frota.
    `.trim(),
    images: [`${process.env.METADATA_BASE}/og-default.jpg`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Query builder
const buildBlogQuery = (
  searchQuery?: string,
  category?: string,
  page: number = 1,
) => {
  const conditions = ['_type == "blogPost"'];

  if (searchQuery) {
    conditions.push(
      `(title match "*${searchQuery}*" || excerpt match "*${searchQuery}*")`,
    );
  }

  if (category) {
    conditions.push(`category->slug.current == "${category}"`);
  }

  const start = (page - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;

  return `{
    "posts": *[${conditions.join(" && ")}] | order(publishedAt desc, _createdAt desc) [${start}...${end}] {
      _id,
      title,
      slug,
      excerpt,
      featuredImage,
      publishedAt,
      readTime,
      _createdAt,
      author->{
        name,
        slug
      },
      category->{
        title,
        slug,
        color
      }
    },
    "total": count(*[${conditions.join(" && ")}]),
    "categories": *[_type == "category"] | order(title asc) {
      title,
      slug,
      color,
      "count": count(*[_type == "blogPost" && references(^._id)])
    },
    "lastUpdate": *[_type == "blogPost"] | order(_updatedAt desc)[0]._updatedAt
  }`;
};

// CACHE NOTICE COMPONENT
const CacheWarning = ({ type }: { type: "fallback" | "emergency" }) => {
  if (type === "fallback") {
    return (
      <div
        className="bg-amber-50 dark:bg-amber-950/20 border 
        border-amber-200 dark:border-amber-800 
        rounded-lg p-4 mb-8 max-w-4xl mx-auto"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-amber-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
            ⚠️ Conteúdo em cache - Atualizações recentes podem não estar
            visíveis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-red-50 dark:bg-red-950/20 border 
      border-red-200 dark:border-red-800 rounded-lg 
      p-6 max-w-md mx-auto mb-8"
    >
      <h2
        className="text-xl font-bold 
      text-red-900 dark:text-red-100 mb-2"
      >
        ⚠️ Serviço Temporariamente Indisponível
      </h2>
      <p
        className="text-red-700 
        dark:text-red-300 text-sm mb-4"
      >
        Estamos com dificuldades para carregar os posts. Tente novamente em
        alguns minutos.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-red-600 hover:bg-red-700 
        text-white px-4 py-2 rounded-lg text-sm transition-colors"
      >
        🔄 Tentar Novamente
      </button>
    </div>
  );
};

const Blog = async ({ searchParams }: BlogPageProps) => {
  const startTime = Date.now();
  const currentPage = Number(searchParams?.page) || 1;

  const searchQuery = searchParams?.q || "";
  const categoryFilter = searchParams?.category || "";

  log.info("Starting blog loading", {
    page: currentPage,
    search: searchQuery,
    category: categoryFilter,
  });

  // STRATEGY 1: Main cache with webhook + temporal fallback
  try {
    const query = buildBlogQuery(searchQuery, categoryFilter, currentPage);

    log.info("Attempt 1: Main cache with hybrid revalidation");

    const data = await client.fetch(
      query,
      {},
      {
        cache: CACHE_CONFIG.primary.cache,
        next: {
          tags: CACHE_CONFIG.primary.tags,
          revalidate: CACHE_CONFIG.primary.revalidate,
        },
      },
    );

    if (!data || !Array.isArray(data.posts)) {
      throw new Error("Dados inválidos retornados do cache principal");
    }

    const { posts, total, categories, lastUpdate } = data;
    const processingTime = Date.now() - startTime;

    log.success("Cache principal bem-sucedido", {
      postsCount: posts.length,
      total,
      processingTime,
      lastUpdate,
    });

    // Check if the cache is too old (> 2 hours)
    const cacheAge = lastUpdate
      ? Date.now() - new Date(lastUpdate).getTime()
      : 0;
    const showCacheWarning =
      cacheAge > 2 * 60 * 60 * 1000 && process.env.NODE_ENV === "development"; // 2 hours

    const processedPosts = posts.map((post: BlogPost) => ({
      _id: post._id,
      title: post.title || "",
      slug: post.slug?.current || post._id,
      excerpt: post.excerpt || "",
      featuredImage: post.featuredImage
        ? {
            url: urlFor(post.featuredImage)?.width(600).height(400).url() || "",
            blurUrl:
              urlFor(post.featuredImage)?.width(20).height(13).blur(50).url() ||
              "",
          }
        : null,
      publishedAt: post.publishedAt || post._createdAt,
      readTime: post.readTime || null,
      author: post.author?.name || "Trajetto Team",
      category: {
        title: post.category?.title || "Gestão de Frotas",
        slug: post.category?.slug?.current || "",
        color: post.category?.color || "#7c3aed",
      },
    }));

    const processedCategories = (categories || []).map((cat: Category) => ({
      title: cat.title,
      slug: cat.slug?.current || "",
      color: cat.color || "#7c3aed",
      count: cat.count || 0,
    }));

    const totalPages = Math.ceil(total / POSTS_PER_PAGE);

    return (
      <>
        <BlogTitleSubtitle />

        {/* Cache warning if needed */}
        {showCacheWarning && <CacheWarning type="fallback" />}

        <BlogSearch categories={processedCategories} totalPosts={total} />

        {processedPosts.length > 0 ? (
          <>
            <BlogPostsGrid posts={processedPosts} />
            <BlogPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalPosts={total}
              postsPerPage={POSTS_PER_PAGE}
            />
          </>
        ) : (
          <BlogEmptyState searchQuery={searchQuery} category={categoryFilter} />
        )}

        <Separator className="my-16" />
      </>
    );
  } catch (primaryError) {
    const processingTime = Date.now() - startTime;

    log.error("Main cache failed", {
      error: primaryError,
      processingTime,
    });

    // STRATEGY 2: Fallback with extended cache
    try {
      log.info("Attempt 2: Fallback with extended cache");

      const fallbackData = await client.fetch(
        buildBlogQuery(searchQuery, categoryFilter, currentPage),
        {},
        {
          cache: CACHE_CONFIG.fallback.cache,
          next: {
            tags: CACHE_CONFIG.fallback.tags,
            revalidate: CACHE_CONFIG.fallback.revalidate,
          },
        },
      );

      if (fallbackData?.posts?.length > 0) {
        const fallbackProcessingTime = Date.now() - startTime;

        log.success("Successful fallback", {
          postsCount: fallbackData.posts.length,
          processingTime: fallbackProcessingTime,
        });

        // Process fallback data (same processing)
        const processedPosts = fallbackData.posts.map((post: BlogPost) => ({
          _id: post._id,
          title: post.title || "",
          slug: post.slug?.current || post._id,
          excerpt: post.excerpt || "",
          featuredImage: post.featuredImage
            ? {
                url:
                  urlFor(post.featuredImage)?.width(600).height(400).url() ||
                  "",
                blurUrl:
                  urlFor(post.featuredImage)
                    ?.width(20)
                    .height(13)
                    .blur(50)
                    .url() || "",
              }
            : null,
          publishedAt: post.publishedAt || post._createdAt,
          readTime: post.readTime || null,
          author: post.author?.name || "Trajetto Team",
          category: {
            title: post.category?.title || "Gestão de Frotas",
            slug: post.category?.slug?.current || "",
            color: post.category?.color || "#7c3aed",
          },
        }));

        const processedCategories = (fallbackData.categories || []).map(
          (cat: Category) => ({
            title: cat.title,
            slug: cat.slug?.current || "",
            color: cat.color || "#7c3aed",
            count: cat.count || 0,
          }),
        );

        return (
          <>
            <BlogTitleSubtitle />
            {process.env.NODE_ENV === "development" && (
              <CacheWarning type="fallback" />
            )}
            <BlogSearch
              categories={processedCategories}
              totalPosts={fallbackData.total}
            />

            {processedPosts.length > 0 ? (
              <>
                <BlogPostsGrid posts={processedPosts} />
                <BlogPagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(fallbackData.total / POSTS_PER_PAGE)}
                  totalPosts={fallbackData.total}
                  postsPerPage={POSTS_PER_PAGE}
                />
              </>
            ) : (
              <BlogEmptyState
                searchQuery={searchQuery}
                category={categoryFilter}
              />
            )}

            <Separator className="my-16" />
          </>
        );
      }
    } catch (fallbackError) {
      log.error("Fallback also failed", fallbackError);
    }

    // STRATEGY 3: Emergency Fallback
    const emergencyProcessingTime = Date.now() - startTime;
    log.error("All strategies failed", {
      processingTime: emergencyProcessingTime,
    });

    return (
      <>
        <BlogTitleSubtitle />
        <div className="text-center py-16">
          {process.env.NODE_ENV === "development" && (
            <CacheWarning type="fallback" />
          )}
        </div>
      </>
    );
  }
};

export default Blog;
