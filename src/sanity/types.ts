import type { PortableTextBlock } from "@portabletext/types";

/** Imagem do Sanity já com metadata (LQIP pro blur + dimensões intrínsecas). */
interface SanityImage {
  alt?: string;
  asset?: {
    url?: string;
    metadata?: {
      /** Base64 minúsculo gerado pelo Sanity — placeholder blur instantâneo. */
      lqip?: string;
      dimensions?: {
        width: number;
        height: number;
        aspectRatio: number;
      };
    };
  };
}

interface Author {
  name: string;
  slug: string;
  bio?: string;
  /** No schema o campo é `avatar` (não `image`). */
  avatar?: SanityImage;
}

interface Category {
  title: string;
  slug: string;
  color?: string;
  /** Quantos posts nessa categoria — só vem na query de lista. */
  count?: number;
}

/** Post na LISTAGEM (sem o corpo Portable Text, mais leve). */
interface BlogPostCard {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: SanityImage;
  publishedAt?: string;
  readTime?: number;
  author?: Pick<Author, "name" | "slug">;
  category?: Category;
}

/** Post COMPLETO (página individual). */
interface BlogPost extends BlogPostCard {
  content?: PortableTextBlock[];
  author?: Author;
  _updatedAt?: string;
  related?: BlogPostCard[];
  /** Achatado de `seo.metaTitle` na query. */
  metaTitle?: string;
  /** Achatado de `seo.metaDescription` na query. */
  metaDescription?: string;
  /** Achatado de `seo.robots` — string do tipo "index, follow". */
  robots?: string;
}

interface BlogListResult {
  posts: BlogPostCard[];
  total: number;
  categories: Category[];
}

interface LegalPolicy {
  title: string;
  slug: string;
  description?: string;
  content?: PortableTextBlock[];
  _updatedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  /** String do tipo "index, follow" / "noindex, nofollow". */
  robots?: string;
}

/** Traduz a string `robots` do schema para o formato do Next Metadata. */
function parseRobots(robots?: string): { index: boolean; follow: boolean } {
  const value = robots?.toLowerCase() ?? "";

  return {
    index: !value.includes("noindex"),
    follow: !value.includes("nofollow"),
  };
}

export { parseRobots };

export type {
  SanityImage,
  Author,
  Category,
  BlogPostCard,
  BlogPost,
  BlogListResult,
  LegalPolicy,
};
