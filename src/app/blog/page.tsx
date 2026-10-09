import { Metadata } from "next";

import { BlogExplorer } from "@/components/blog/blog-explorer";
import { Eyebrow } from "@/components/site/primitives";
import { EditorialCtaBand } from "@/components/site/editorial/cta-band";
import { JsonLd } from "@/components/seo/json-ld";

import { getBlogCategories, getPosts } from "@/lib/content/blog";
import { buildPageMetadata } from "@/lib/page-metadata";
import { absoluteUrl, siteConfig } from "@/lib/site";

const DESCRIPTION =
  "Artigos da equipe Trajetto sobre gestão de entregas, gestão de frotas, operação em campo, integrações e LGPD, com exemplos do dia a dia de transportadoras e frotistas.";

export function generateMetadata(): Metadata {
  const metadata = buildPageMetadata({
    path: "/blog",
    title: "Blog",
    socialTitle: "Blog do Trajetto: frotas e entregas na prática",
    description: DESCRIPTION,
    keywords: [
      "blog de logística",
      "gestão de entregas",
      "gestão de frotas",
      "comprovante de entrega",
      "torre de controle",
    ],
  });

  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      types: { "application/rss+xml": absoluteUrl("/feed.xml") },
    },
  };
}

/**
 * Static: the list of posts is known at build time and search, filters and
 * pages run in the browser. Only summaries reach the client, never bodies.
 */
const Blog = (): JSX.Element => {
  const posts = getPosts();
  const categories = getBlogCategories();

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `Blog do ${siteConfig.name}`,
    description: DESCRIPTION,
    url: absoluteUrl("/blog"),
    inLanguage: siteConfig.locale,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: absoluteUrl("/"),
    },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      url: absoluteUrl(`/blog/${post.slug}`),
      datePublished: post.date,
      dateModified: post.updated ?? post.date,
      author: { "@type": "Organization", name: post.author },
    })),
  };

  return (
    <main>
      <JsonLd value={blogJsonLd} />

      <BlogExplorer
        posts={posts}
        categories={categories}
        intro={
          <>
            <Eyebrow>BLOG DO TRAJETTO</Eyebrow>
            <h1
              id="blog-titulo"
              className="m-0 font-site-display text-[clamp(46px,6.4vw,88px)] font-medium leading-[.96] tracking-[-.045em] [text-wrap:balance]"
            >
              Guias para quem move frotas e entregas.
            </h1>
          </>
        }
      />

      <EditorialCtaBand />
    </main>
  );
};

export default Blog;
