import { Metadata } from "next";

import { BlogTitleSubtitle } from "@/components/blog/blog-title-subtitle";
import { BlogSearch } from "@/components/blog/blog-search";

import { BlogPostsGrid } from "@/components/blog/blog-posts-grid";
import { BlogPagination } from "@/components/blog/blog-pagination";

import { BlogEmptyState } from "@/components/blog/blog-empty-state";
import { Separator } from "@/components/ui/separator";

import { sanityFetch } from "@/sanity/fetch";
import { BLOG_LIST_QUERY } from "@/sanity/queries";

import type { BlogListResult } from "@/sanity/types";

const POSTS_PER_PAGE = 12;

/** ISR: fallback de 1h; o gatilho principal é a tag `blog` via webhook. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog",
  description: `
    Descubra estratégias, dicas e insights para otimizar a gestão da sua frota.
    Blog oficial do Trajetto com conteúdo especializado em gestão de frotas,
    logística e redução de custos operacionais.
  `.trim(),
  keywords: ["blog Trajetto", "gestão de frotas", "logística"],
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

interface BlogPageProps {
  searchParams: {
    page?: string;
    q?: string;
    category?: string;
  };
}

const Blog = async ({ searchParams }: BlogPageProps): Promise<JSX.Element> => {
  const currentPage = Math.max(1, Number(searchParams?.page) || 1);

  const searchQuery = searchParams?.q?.trim() ?? "";
  const categoryFilter = searchParams?.category?.trim() ?? "";

  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;

  const data = await sanityFetch<BlogListResult>(
    BLOG_LIST_QUERY,
    {
      // Parâmetros (sem injeção). `null` quando ausente → o filtro é ignorado
      // no GROQ via `!defined($q)` / `!defined($category)`.
      q: searchQuery ? `${searchQuery}*` : null,
      category: categoryFilter || null,
      start,
      end,
    },
    { tags: ["blog"] },
  );

  const posts = data?.posts ?? [];
  const total = data?.total ?? 0;

  const categories = data?.categories ?? [];
  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  const processedPosts = posts.map((post) => ({
    _id: post._id,
    title: post.title || "",
    slug: post.slug,
    excerpt: post.excerpt ?? "",
    featuredImage: post.featuredImage ?? null,
    publishedAt: post.publishedAt ?? new Date().toISOString(),
    readTime: post.readTime ?? null,
    author: post.author?.name ?? "Equipe Trajetto",
    category: {
      title: post.category?.title ?? "Gestão de Frotas",
      slug: post.category?.slug ?? "",
      color: post.category?.color ?? "#2563eb",
    },
  }));

  const processedCategories = categories.map((cat) => ({
    title: cat.title,
    slug: cat.slug,
    color: cat.color ?? "#2563eb",
    count: cat.count ?? 0,
  }));

  return (
    <>
      <BlogTitleSubtitle />
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
};

export default Blog;
