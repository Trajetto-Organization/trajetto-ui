import type { PostMeta } from "@/lib/content/types";

/**
 * Blog search and paging, in the browser over the static list of posts.
 * Client-safe (no fs): the explorer and the unit suite share it.
 */

export const POSTS_PER_PAGE = 9;

export interface BlogFilters {
  query: string;
  category: string;
  tag: string;
  page: number;
}

export const EMPTY_FILTERS: BlogFilters = {
  query: "",
  category: "",
  tag: "",
  page: 1,
};

/** Lowercase, no accents: typing "gestao" finds "Gestão". */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function haystack(post: PostMeta): string {
  return normalize(
    [
      post.title,
      post.description,
      post.category.title,
      ...post.tags,
      ...post.seo.keywords,
    ].join(" "),
  );
}

/** Every word must match (AND): typing more narrows the result. */
export function filterPosts(
  posts: PostMeta[],
  { query, category, tag }: Pick<BlogFilters, "query" | "category" | "tag">,
): PostMeta[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const wantedTag = normalize(tag);

  return posts.filter((post) => {
    if (category && post.category.slug !== category) return false;
    if (wantedTag && !post.tags.some((item) => normalize(item) === wantedTag)) {
      return false;
    }

    if (terms.length === 0) return true;

    const text = haystack(post);
    return terms.every((term) => text.includes(term));
  });
}

export function paginate<T>(
  items: T[],
  page: number,
  perPage: number = POSTS_PER_PAGE,
): { items: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);

  return {
    items: items.slice((current - 1) * perPage, current * perPage),
    page: current,
    totalPages,
  };
}

export function readFilters(params: URLSearchParams): BlogFilters {
  return {
    query: params.get("q") ?? "",
    category: params.get("category") ?? "",
    tag: params.get("tag") ?? "",
    page: Math.max(1, Number.parseInt(params.get("page") ?? "", 10) || 1),
  };
}

/** The query string for a set of filters, "" when there is none. */
export function toSearchString(filters: BlogFilters): string {
  const params = new URLSearchParams();

  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.category) params.set("category", filters.category);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.page > 1) params.set("page", String(filters.page));

  const search = params.toString();
  return search ? `?${search}` : "";
}
