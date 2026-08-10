import { Metadata } from "next";
import { notFound } from "next/navigation";

import Link from "next/link";

import { BookOpen, Clock, Calendar, Share2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { ShareButton } from "./share-button";

import { PortableTextContent } from "@/components/blog/portable-text";
import { SanityImage } from "@/components/blog/sanity-image";

import { sanityFetch } from "@/sanity/fetch";
import { BLOG_POST_QUERY, BLOG_SLUGS_QUERY } from "@/sanity/queries";

import { parseRobots, type BlogPost } from "@/sanity/types";

interface BlogPostPageProps {
  params: { slug: string };
}

/** ISR: fallback de 1h; o gatilho principal é a tag `blog` via webhook. */
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await sanityFetch<string[]>(
    BLOG_SLUGS_QUERY,
    {},
    { tags: ["blog"] },
  );

  return (slugs ?? []).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = params;

  const post = await sanityFetch<BlogPost>(
    BLOG_POST_QUERY,
    { slug },
    { tags: ["blog", `blog:${slug}`] },
  );

  if (!post) {
    return {
      title: "Post não encontrado",
      description: "O post solicitado não foi encontrado.",
      robots: { index: false, follow: false },
    };
  }

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt;

  // O schema não tem `ogImage` dedicado: a imagem destacada vira o card
  // social, recortada em 1200x630 pelo próprio CDN do Sanity.
  const ogBase = post.featuredImage?.asset?.url;
  const ogUrl = ogBase
    ? `${ogBase}?w=1200&h=630&fit=crop&auto=format`
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post._updatedAt,
      authors: post.author?.name ? [post.author.name] : undefined,
      images: ogUrl ? [ogUrl] : undefined,
      url: `${process.env.METADATA_BASE}/blog/${post.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogUrl ? [ogUrl] : undefined,
    },
    robots: parseRobots(post.robots),
  };
}

const BlogPostPage = async ({
  params,
}: BlogPostPageProps): Promise<JSX.Element> => {
  const { slug } = params;

  const post = await sanityFetch<BlogPost>(
    BLOG_POST_QUERY,
    { slug },
    { tags: ["blog", `blog:${slug}`] },
  );

  if (!post) notFound();

  const formattedDate = new Date(
    post.publishedAt || new Date().toISOString(),
  ).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="py-14">
      <Card className="max-w-4xl mx-auto overflow-hidden">
        {/* Hero Image */}
        {post.featuredImage?.asset?.url && (
          <div className="aspect-video relative overflow-hidden">
            <SanityImage
              image={post.featuredImage}
              alt={post.title}
              fill
              className="object-cover w-full h-full"
              sizes="(max-width: 1024px) 100vw, 1024px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="px-8 pb-7 mt-5">
          {/* Article Header */}
          <div className="mt-3">
            <div
              className="flex items-center gap-2 text-sm mb-4"
              style={{ color: post.category?.color || "#2563eb" }}
            >
              <BookOpen className="w-4 h-4" />
              <Link
                href={`/blog?category=${post.category?.slug ?? ""}`}
                className="hover:underline"
              >
                {post.category?.title || "Sem categoria"}
              </Link>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-slate-800 mb-4">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <span>{post.author?.name || "Autor desconhecido"}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formattedDate}
              </span>
              {post.readTime && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {post.readTime} min de leitura
                  </span>
                </>
              )}
            </div>
          </div>

          <Separator className="my-8" />

          {/* Article Content */}
          <div className="max-w-none">
            <PortableTextContent value={post.content} />
          </div>

          <Separator className="my-8" />

          {/* Author Bio */}
          <div className="bg-muted/30 rounded-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {post.author?.avatar?.asset?.url ? (
                <SanityImage
                  image={post.author.avatar}
                  alt={post.author.name}
                  width={80}
                  height={80}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br
                  from-blue-500 to-indigo-600 flex items-center flex-shrink-0
                  justify-center text-white text-xl sm:text-2xl font-bold"
                >
                  {post.author?.name?.[0] || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0 w-full">
                <h3 className="font-semibold text-base sm:text-lg mb-1">
                  {post.author?.name || "Autor"}
                </h3>
                {post.author?.bio && (
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">
                    {post.author.bio}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Share */}
          <div className="mt-8">
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center
              justify-between gap-4 p-4 sm:p-5 bg-gradient-to-r
              from-zinc-50 to-blue-50/40 rounded-xl border border-zinc-200/70"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div
                  className="p-2 sm:p-2.5 bg-white dark:bg-gray-800 rounded-lg
                  shadow-sm border border-gray-200/60 dark:border-gray-700/60 flex-shrink-0"
                >
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#2563eb]" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Gostou do conteúdo?
                  </p>
                  <p className="text-[0.65rem] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5 break-words">
                    Compartilhe com quem pode se interessar
                  </p>
                </div>
              </div>

              <ShareButton
                title={post.title}
                description={post.excerpt}
                className="bg-[#2563eb] text-white border-0
                px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium
                transition-all duration-200 shadow-sm hover:shadow-md
                hover:shadow-[#2563eb]/25 flex items-center gap-2 w-full sm:w-auto
                justify-center flex-shrink-0"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BlogPostPage;
