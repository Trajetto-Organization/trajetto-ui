import groq from "groq";

/**
 * GROQ queries for the blog/legal sections. Everything is handled via parameters (`$q`, `$category`, `$slug`)
 * — never interpolating user input directly into the query string.
 *
 * Field names follow the trajetto-studio schema, which preserves the previous schema:
 * post SEO resides within the `seo` object, the author uses `avatar` (not `image`),
 * and policies use the `robots` string (not a boolean).
 */

/** Reusable projection for the post card (excluding the Portable Text body). */
const POST_CARD = groq`{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  readTime,
  featuredImage{
    alt,
    asset->{ url, metadata { lqip, dimensions } }
  },
  author->{ name, "slug": slug.current },
  category->{ title, "slug": slug.current, color }
}`;

/** Filter shared between the listing and the count (keeps both identical). */
const LIST_FILTER = groq`_type == "blogPost" && defined(slug.current)
  && (!defined($category) || category->slug.current == $category)
  && (!defined($q) || title match $q || excerpt match $q)`;

/** List: paginated posts + total (for the pager) + categories (with counts). */
const BLOG_LIST_QUERY = groq`{
  "posts": *[${LIST_FILTER}] | order(publishedAt desc, _createdAt desc)[$start...$end] ${POST_CARD},
  "total": count(*[${LIST_FILTER}]),
  "categories": *[_type == "category"] | order(title asc){
    title,
    "slug": slug.current,
    color,
    "count": count(*[_type == "blogPost" && references(^._id)])
  }
}`;

/** All post slugs — feeds `generateStaticParams`. */
const BLOG_SLUGS_QUERY = groq`*[_type == "blogPost" && defined(slug.current)].slug.current`;

/** Full post + 3 related posts from the same category. */
const BLOG_POST_QUERY = groq`*[_type == "blogPost" && slug.current == $slug][0]{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  readTime,
  _updatedAt,
  content,
  featuredImage{
    alt,
    asset->{ url, metadata { lqip, dimensions } }
  },
  "metaTitle": seo.metaTitle,
  "metaDescription": seo.metaDescription,
  "robots": seo.robots,
  author->{
    name,
    "slug": slug.current,
    bio,
    "avatar": avatar{ asset->{ url, metadata { lqip } } }
  },
  category->{ title, "slug": slug.current, color },
  "related": *[
    _type == "blogPost"
    && slug.current != $slug
    && category._ref == ^.category._ref
  ] | order(publishedAt desc)[0...3] ${POST_CARD}
}`;

/** Legal policy by slug (terms, privacy, etc.). */
const LEGAL_POLICY_QUERY = groq`*[_type == "legalPolicy" && slug.current == $slug][0]{
  title,
  "slug": slug.current,
  description,
  content,
  _updatedAt,
  metaTitle,
  metaDescription,
  robots
}`;

/** Slugs for all policies — `generateStaticParams` for /legal. */
const LEGAL_SLUGS_QUERY = groq`*[_type == "legalPolicy" && defined(slug.current)].slug.current`;

/** Posts for the sitemap (slug + date + featured status, which determines priority). */
const BLOG_SITEMAP_QUERY = groq`*[_type == "blogPost" && defined(slug.current)]{
  "slug": slug.current,
  "lastModified": coalesce(publishedAt, _updatedAt, _createdAt),
  featured
}`;

/** Legal policies for the sitemap. */
const LEGAL_SITEMAP_QUERY = groq`*[_type == "legalPolicy" && defined(slug.current)]{
  "slug": slug.current,
  "lastModified": coalesce(_updatedAt, _createdAt)
}`;

export {
  BLOG_LIST_QUERY,
  BLOG_SLUGS_QUERY,
  BLOG_POST_QUERY,
  LEGAL_POLICY_QUERY,
  LEGAL_SLUGS_QUERY,
  BLOG_SITEMAP_QUERY,
  LEGAL_SITEMAP_QUERY,
};
