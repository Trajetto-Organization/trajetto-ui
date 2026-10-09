import fs from "node:fs";
import path from "node:path";

import { BLOG_CATEGORIES } from "@/content/blog/categories";

import {
  blogFrontmatterSchema,
  parseFrontmatter,
  readFrontmatter,
} from "@/lib/content/frontmatter";
import { visibleItems } from "@/lib/content/drafts";

import type {
  BlogCategoryWithCount,
  Post,
  PostMeta,
} from "@/lib/content/types";

/**
 * Blog posts from `src/content/blog/<slug>.mdx`. Uses `fs`: import only from
 * Server Components, route handlers and the build (types live in types.ts).
 */

export const BLOG_DIR = path.join(process.cwd(), "src", "content", "blog");

/** A conservative Portuguese reading speed. */
const WORDS_PER_MINUTE = 200;

export function estimateReadingTime(body: string): number {
  const words = body
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** One file, validated. Pure apart from its input, so tests can feed it text. */
export function parsePost(file: string, raw: string): Post {
  const { data, body } = readFrontmatter(file, raw);

  const frontmatter = parseFrontmatter(blogFrontmatterSchema, data, file, {
    forbidImages: true,
  });

  return {
    slug: frontmatter.slug,
    title: frontmatter.title,
    description: frontmatter.description,
    date: frontmatter.date,
    updated: frontmatter.updated,
    category:
      BLOG_CATEGORIES[frontmatter.category as keyof typeof BLOG_CATEGORIES],
    tags: frontmatter.tags,
    author: frontmatter.author,
    featured: frontmatter.featured,
    draft: frontmatter.draft,
    readingTime: estimateReadingTime(body),
    seo: frontmatter.seo,
    body,
    file,
  };
}

let cache: Post[] | null = null;

/** Every post, drafts included, newest first. */
export function loadAllPosts(): Post[] {
  // Development rereads the folder so an edited post shows on refresh.
  if (cache && process.env.NODE_ENV === "production") return cache;

  const files = fs.existsSync(BLOG_DIR)
    ? fs.readdirSync(BLOG_DIR).filter((file) => file.endsWith(".mdx"))
    : [];

  const posts = files
    .map((file) =>
      parsePost(file, fs.readFileSync(path.join(BLOG_DIR, file), "utf8")),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "pt-BR"),
    );

  cache = posts;
  return posts;
}

function toMeta({ body: _body, file: _file, ...meta }: Post): PostMeta {
  return meta;
}

interface VisibilityOptions {
  includeDrafts?: boolean;
}

function visiblePosts({ includeDrafts }: VisibilityOptions = {}): Post[] {
  return visibleItems(loadAllPosts(), includeDrafts);
}

/** Posts without their body, newest first. */
export function getPosts(options?: VisibilityOptions): PostMeta[] {
  return visiblePosts(options).map(toMeta);
}

export function getPost(
  slug: string,
  options?: VisibilityOptions,
): Post | null {
  return visiblePosts(options).find((post) => post.slug === slug) ?? null;
}

/**
 * Same category weighs 3, each shared tag 1; ties go to the newest. Posts
 * with no overlap still fill the list (newest first), as in the design, so a
 * category with a single post does not end without "Continue lendo".
 */
export function getRelatedPosts(
  slug: string,
  limit: number = 3,
  options?: VisibilityOptions,
): PostMeta[] {
  const posts = getPosts(options);
  const current = posts.find((post) => post.slug === slug);

  if (!current) return [];

  const tags = new Set(current.tags.map((tag) => tag.toLowerCase()));

  return posts
    .filter((post) => post.slug !== slug)
    .map((post) => ({
      post,
      score:
        (post.category.slug === current.category.slug ? 3 : 0) +
        post.tags.filter((tag) => tags.has(tag.toLowerCase())).length,
    }))
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .slice(0, limit)
    .map(({ post }) => post);
}

/** Chronological neighbours: `previous` is older, `next` is newer. */
export function getAdjacentPosts(
  slug: string,
  options?: VisibilityOptions,
): { previous: PostMeta | null; next: PostMeta | null } {
  const posts = getPosts(options);
  const index = posts.findIndex((post) => post.slug === slug);

  if (index === -1) return { previous: null, next: null };

  return { previous: posts[index + 1] ?? null, next: posts[index - 1] ?? null };
}

/** Categories that have at least one visible post. */
export function getBlogCategories(
  options?: VisibilityOptions,
): BlogCategoryWithCount[] {
  const posts = getPosts(options);

  return Object.values(BLOG_CATEGORIES)
    .map((category) => ({
      ...category,
      count: posts.filter((post) => post.category.slug === category.slug)
        .length,
    }))
    .filter((category) => category.count > 0);
}
