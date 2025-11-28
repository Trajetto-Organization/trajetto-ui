import { Metadata } from "next";
import { notFound } from "next/navigation";

import { client } from "@/sanity/lib/client";
import { PortableText } from "@portabletext/react";

import imageUrlBuilder from "@sanity/image-url";
import { SanityImageSource } from "@sanity/image-url/lib/types/types";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import {
  BookOpen,
  Clock,
  Calendar,
  Twitter,
  Linkedin,
  Instagram,
  Link as LinkIcon,
  Share2,
} from "lucide-react";

import Link from "next/link";
import Image from "next/image";

import { ShareButton } from "./share-button";

const CACHE_CONFIG = {
  primary: {
    cache: "force-cache" as const,
    revalidate: process.env.NODE_ENV === "production" ? 86400 : 300, // Revalidates once a day in prod, 5min dev
  },
  fallback: {
    cache: "force-cache" as const,
    revalidate: 172800, // 48 hours as a last resort for individual posts
  },
};

const log = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `🔄 [BLOG-POST] ${message}`,
        data ? JSON.stringify(data, null, 2) : "",
      );
    }
  },
  error: (message: string, error?: any) => {
    console.error(`❌ [BLOG-POST] ${message}`, error);
  },
  success: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `✅ [BLOG-POST] ${message}`,
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
  content: any[];
  featuredImage?: any;
  publishedAt?: string;
  readTime?: number;
  _createdAt: string;
  _updatedAt?: string;
  author?: {
    name: string;
    slug: { current: string };
    bio?: string;
    avatar?: any;
    socialLinks?: {
      twitter?: string;
      linkedin?: string;
      instagram?: string;
    };
  };
  category?: {
    title: string;
    slug: { current: string };
    color: string;
  };
  tags?: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    focusKeyword?: string;
    keywords?: string[];
    canonicalUrl?: string;
    robots?: string;
  };
}

interface BlogPageProps {
  params: {
    slug: string;
  };
}

// Query to fetch blog post
const POST_QUERY = `*[_type == "blogPost" && slug.current == $slug][0] {
  _id,
  title,
  slug,
  excerpt,
  content,
  featuredImage,
  publishedAt,
  readTime,
  _createdAt,
  _updatedAt,
  tags,
  author->{
    name,
    slug,
    bio,
    avatar,
    socialLinks
  },
  category->{
    title,
    slug,
    color
  },
  seo
}`;

async function fetchPostWithFallback(slug: string): Promise<BlogPost | null> {
  const startTime = Date.now();

  log.info(`Searching post: ${slug}`);

  try {
    log.info("Attempt 1: Main cache with hybrid revalidation");

    const post = await client.fetch<BlogPost>(
      POST_QUERY,
      { slug },
      {
        cache: CACHE_CONFIG.primary.cache,
        next: {
          tags: ["blog-posts", `blog-post-${slug}`],
          revalidate: CACHE_CONFIG.primary.revalidate,
        },
      },
    );

    if (post) {
      const processingTime = Date.now() - startTime;
      log.success("Post encontrado no cache principal", {
        slug,
        title: post.title,
        processingTime,
        lastUpdate: post._updatedAt,
      });
      return post;
    }

    // If you didn't find it, it may be that the post doesn't exist.
    log.info("Post not found in main cache");
    return null;
  } catch (primaryError) {
    const processingTime = Date.now() - startTime;
    log.error("Main cache failed", {
      error: primaryError,
      processingTime,
      slug,
    });

    try {
      log.info("Attempt 2: Fallback with extended cache");

      const fallbackPost = await client.fetch<BlogPost>(
        POST_QUERY,
        { slug },
        {
          cache: CACHE_CONFIG.fallback.cache,
          next: {
            tags: [`blog-post-fallback-${slug}`],
            revalidate: CACHE_CONFIG.fallback.revalidate,
          },
        },
      );

      if (fallbackPost) {
        const fallbackProcessingTime = Date.now() - startTime;
        log.success("Post found in fallback", {
          slug,
          title: fallbackPost.title,
          processingTime: fallbackProcessingTime,
        });
        return fallbackPost;
      }

      log.info("Post not found in fallback");
      return null;
    } catch (fallbackError) {
      log.error("Fallback also failed", { error: fallbackError, slug });

      // If both fail, we assume the post does not exist.
      return null;
    }
  }
}

const CacheWarning = () => (
  <div
    className="bg-amber-50 dark:bg-amber-950/20 
    border border-amber-200 dark:border-amber-800 
    rounded-lg p-4 mb-6"
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
        ⚠️ Este conteúdo pode estar em cache - Atualizações recentes podem não
        estar visíveis
      </p>
    </div>
  </div>
);

// Custom components for PortableText
const components = {
  types: {
    image: ({ value }: any) => {
      if (!value?.asset?._ref) {
        return null;
      }
      return (
        <div className="my-8">
          <Image
            src={urlFor(value)?.width(800).url() || ""}
            alt={value.alt || " "}
            width={800}
            height={450}
            className="rounded-lg w-full"
          />
        </div>
      );
    },
  },
  block: {
    h1: ({ children }: any) => (
      <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-2xl font-semibold mt-8 mb-4">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-xl font-semibold mt-6 mb-3">{children}</h3>
    ),
    normal: ({ children }: any) => (
      <p className="mb-4 leading-relaxed">{children}</p>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-[#7c3aed] pl-4 py-2 my-4 italic">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }: any) => (
      <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
    ),
    number: ({ children }: any) => (
      <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }: any) => <li className="mb-2">{children}</li>,
    number: ({ children }: any) => <li className="mb-2">{children}</li>,
  },
  marks: {
    strong: ({ children }: any) => (
      <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }: any) => <em className="italic">{children}</em>,
    code: ({ children }: any) => (
      <code
        className="bg-muted px-1.5 py-0.5 
        rounded text-sm font-mono"
      >
        {children}
      </code>
    ),
    link: ({ value, children }: any) => {
      const target = (value?.href || "").startsWith("http")
        ? "_blank"
        : undefined;
      return (
        <a
          href={value?.href}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          className="text-[#7c3aed] hover:underline"
        >
          {children}
        </a>
      );
    },
  },
};

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const post = await fetchPostWithFallback(params.slug);

  if (!post) {
    return {
      title: "Post não encontrado",
      description: "O post solicitado não foi encontrado.",
      robots: "noindex, nofollow",
    };
  }

  const imageUrl = post.featuredImage
    ? urlFor(post.featuredImage)?.width(1200).height(630).url()
    : undefined;

  return {
    title: post.seo?.metaTitle || post.title,
    description: post.seo?.metaDescription || post.excerpt,
    keywords: post.seo?.keywords?.join(", ") || undefined,
    robots: post.seo?.robots || "index, follow",
    openGraph: {
      title: post.seo?.metaTitle || post.title,
      description: post.seo?.metaDescription || post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post._updatedAt,
      authors: post.author?.name ? [post.author.name] : undefined,
      images: imageUrl ? [imageUrl] : undefined,
      url: `${process.env.METADATA_BASE}/blog/${params.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.seo?.metaTitle || post.title,
      description: post.seo?.metaDescription || post.excerpt,
      images: imageUrl ? [imageUrl] : undefined,
    },
    alternates: {
      canonical: post.seo?.canonicalUrl || `/blog/${params.slug}`,
    },
  };
}

const BlogContent = async ({ params }: BlogPageProps) => {
  const post = await fetchPostWithFallback(params.slug);

  if (!post) {
    log.error("Post não encontrado após todas as tentativas", {
      slug: params.slug,
    });
    notFound();
  }

  // Check cache age
  const postAge = post._updatedAt
    ? Date.now() - new Date(post._updatedAt).getTime()
    : Date.now() - new Date(post._createdAt).getTime();

  const showCacheWarning =
    postAge > 6 * 60 * 60 * 1000 && process.env.NODE_ENV === "development"; // 6 hours

  const formattedDate = new Date(
    post.publishedAt || post._createdAt,
  ).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Social media icons mapping
  const socialIcons = {
    twitter: Twitter,
    linkedin: Linkedin,
    instagram: Instagram,
  };

  log.success("Post rendered successfully", {
    slug: params.slug,
    title: post.title,
    showCacheWarning,
  });

  return (
    <div className="py-14">
      <Card
        className="max-w-4xl mx-auto 
        overflow-hidden"
      >
        {/* Hero Image */}
        {post.featuredImage && (
          <div
            className="aspect-video relative 
            overflow-hidden"
          >
            <Image
              src={
                urlFor(post.featuredImage)?.width(1200).height(675).url() || ""
              }
              alt={post.title}
              width={1200}
              height={675}
              className="object-cover w-full h-full"
              priority
            />
            <div
              className="absolute inset-0 bg-gradient-to-t 
              from-black/50 to-transparent"
            />
          </div>
        )}

        {/* Content */}
        <div className="px-8 pb-7 mt-5">
          {showCacheWarning && <CacheWarning />}

          {/* Article Header */}
          <div className="mt-3">
            <div
              className="flex items-center gap-2 text-sm mb-4"
              style={{ color: post.category?.color || "#7c3aed" }}
            >
              <BookOpen className="w-4 h-4" />
              <Link
                href={`/blog?category=${post.category?.slug.current}`}
                className="hover:underline"
              >
                {post.category?.title || "Sem categoria"}
              </Link>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {post.title}
            </h1>
            <div
              className="flex items-center gap-4 text-sm 
              text-gray-600 dark:text-gray-400"
            >
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
          <div
            className="prose prose-lg 
            dark:prose-invert max-w-none"
          >
            {post.content && (
              <PortableText value={post.content} components={components} />
            )}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <>
              <Separator className="my-8" />
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog?q=${encodeURIComponent(tag)}`}
                    className="px-3 py-1 bg-muted hover:bg-muted/80 
                    rounded-full text-sm transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </>
          )}

          <Separator className="my-8" />

          {/* Author Bio */}
          <div className="bg-muted/30 rounded-xl p-4 sm:p-6">
            <div
              className="flex flex-col 
              sm:flex-row items-start gap-4"
            >
              {post.author?.avatar ? (
                <Image
                  src={
                    urlFor(post.author.avatar)?.width(80).height(80).url() || ""
                  }
                  alt={post.author.name}
                  width={80}
                  height={80}
                  className="w-16 h-16 sm:w-20 sm:h-20
                  rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r
                  from-[#7c3aed] to-purple-500 flex items-center flex-shrink-0
                  justify-center text-white text-xl sm:text-2xl font-bold"
                >
                  {post.author?.name?.[0] || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0 w-full">
                <h3
                  className="font-semibold 
                  text-base sm:text-lg mb-1"
                >
                  {post.author?.name || "Autor"}
                </h3>
                {post.author?.bio && (
                  <p
                    className="text-xs sm:text-sm text-gray-600
                    dark:text-gray-400 mb-3 break-words"
                  >
                    {post.author.bio}
                  </p>
                )}

                {/* Social Links */}
                {post.author?.socialLinks && (
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(post.author.socialLinks).map(
                      ([platform, url]) => {
                        if (!url) return null;
                        const Icon =
                          socialIcons[platform as keyof typeof socialIcons];

                        return (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-background hover:bg-muted
                            rounded-lg transition-colors"
                          >
                            {Icon ? (
                              <Icon className="w-4 h-4" />
                            ) : (
                              <LinkIcon className="w-4 h-4" />
                            )}
                          </a>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation and Share */}
          <div className="mt-8">
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center
              justify-between gap-4 p-4 sm:p-5 bg-gradient-to-r 
              from-gray-50 to-purple-50/40 dark:from-gray-900/60 
              dark:to-purple-950/30 rounded-xl border border-gray-200/70
              dark:border-gray-700/50 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div
                  className="p-2 sm:p-2.5 bg-white dark:bg-gray-800 rounded-lg
                  shadow-sm border border-gray-200/60 dark:border-gray-700/60 flex-shrink-0"
                >
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#7c3aed]" />
                </div>

                <div className="min-w-0">
                  <p
                    className="text-xs sm:text-sm 
                    font-semibold text-gray-900 
                    dark:text-gray-100"
                  >
                    Gostou do conteúdo?
                  </p>
                  <p
                    className="text-[0.65rem] sm:text-xs 
                    text-gray-600 dark:text-gray-400 mt-0.5 break-words"
                  >
                    Compartilhe com quem pode se interessar
                  </p>
                </div>
              </div>

              <ShareButton
                title={post.title}
                description={post.excerpt}
                className="bg-[#7c3aed] text-white border-0
                px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium
                transition-all duration-200 shadow-sm hover:shadow-md
                hover:shadow-[#7c3aed]/25 flex items-center gap-2 w-full sm:w-auto
                justify-center flex-shrink-0"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BlogContent;
