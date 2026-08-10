import groq from "groq";

/**
 * Queries GROQ do blog/legal. TUDO por PARÂMETRO (`$q`, `$category`, `$slug`)
 * — nunca interpolando input do usuário na string da query.
 *
 * Os nomes de campo seguem o schema do trajetto-studio, que preservou o schema
 * anterior: o SEO do post vive dentro do objeto `seo`, o autor usa `avatar`
 * (não `image`) e as políticas usam a string `robots` (não um booleano).
 */

/** Projeção reusada do card de post (sem o corpo Portable Text). */
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

/** Filtro compartilhado entre a listagem e o count (mantém os dois idênticos). */
const LIST_FILTER = groq`_type == "blogPost" && defined(slug.current)
  && (!defined($category) || category->slug.current == $category)
  && (!defined($q) || title match $q || excerpt match $q)`;

/** Lista: posts paginados + total (pro paginador) + categorias (com contagem). */
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

/** Todos os slugs de post — alimenta o `generateStaticParams`. */
const BLOG_SLUGS_QUERY = groq`*[_type == "blogPost" && defined(slug.current)].slug.current`;

/** Post completo + 3 relacionados da mesma categoria. */
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

/** Política legal por slug (termos, privacidade, etc). */
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

/** Slugs de todas as políticas — `generateStaticParams` do /legal. */
const LEGAL_SLUGS_QUERY = groq`*[_type == "legalPolicy" && defined(slug.current)].slug.current`;

/** Posts pro sitemap (slug + data + destaque, que define a prioridade). */
const BLOG_SITEMAP_QUERY = groq`*[_type == "blogPost" && defined(slug.current)]{
  "slug": slug.current,
  "lastModified": coalesce(publishedAt, _updatedAt, _createdAt),
  featured
}`;

/** Políticas legais pro sitemap. */
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
