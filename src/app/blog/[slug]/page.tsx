import { Metadata } from "next";
import { notFound } from "next/navigation";

import Link from "next/link";

import { Calendar, Clock } from "lucide-react";

import { blogMdxComponents } from "@/components/mdx";
import { JsonLd } from "@/components/seo/json-ld";
import { LogoMark } from "@/components/shared/logo-mark";
import { MovingArrow } from "@/components/site/arrow-link";
import { categoryAccent } from "@/components/site/editorial/category";
import { EditorialCtaBand } from "@/components/site/editorial/cta-band";
import { MobileToc } from "@/components/site/editorial/mobile-toc";
import { ReadingProgress } from "@/components/site/editorial/reading-progress";
import { RelatedCard } from "@/components/site/editorial/related-card";
import { ShareButton } from "@/components/site/editorial/share-button";
import { EditorialToc } from "@/components/site/editorial/toc";

import { getPost, getPosts, getRelatedPosts } from "@/lib/content/blog";
import { editorialDate } from "@/components/site/editorial/date";
import { renderMdx } from "@/lib/content/mdx";
import { buildPageMetadata } from "@/lib/page-metadata";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

interface BlogPostPageProps {
  params: { slug: string };
}

// Every post is prerendered; an unknown slug is a real 404.
export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return getPosts().map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: BlogPostPageProps): Metadata {
  const post = getPost(params.slug);

  if (!post) {
    return { title: "Artigo não encontrado", robots: { index: false } };
  }

  return buildPageMetadata({
    path: `/blog/${post.slug}`,
    title: post.seo.title ?? post.title,
    socialTitle: post.title,
    description: post.seo.description ?? post.description,
    keywords: post.seo.keywords.length ? post.seo.keywords : post.tags,
    type: "article",
    // The card image comes from ./opengraph-image.tsx, one per post.
    defaultImage: false,
    noindex: post.draft,
    article: {
      publishedTime: post.date,
      modifiedTime: post.updated,
      authors: [post.author],
      section: post.category.title,
      tags: post.tags,
    },
  });
}

/** The prose element: the reading bar measures it. */
const PROSE_ID = "artigo-texto";

const BlogPostPage = async ({
  params,
}: BlogPostPageProps): Promise<JSX.Element> => {
  const post = getPost(params.slug);

  if (!post) notFound();

  const { Content, toc } = await renderMdx(post.body, {
    file: post.file,
    components: blogMdxComponents,
  });

  const related = getRelatedPosts(post.slug);
  const url = absoluteUrl(`/blog/${post.slug}`);
  // The design dates an article by its last revision.
  const shownDate = post.updated ?? post.date;
  const hasToc = toc.length > 2;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: absoluteUrl(`/blog/${post.slug}/opengraph-image`),
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    inLanguage: siteConfig.locale,
    articleSection: post.category.title,
    keywords: post.tags.join(", "),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: {
      "@type": "Organization",
      name: post.author,
      url: absoluteUrl("/sobre"),
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: absoluteUrl("/"),
      logo: { "@type": "ImageObject", url: absoluteUrl("/favicon-512.png") },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Início",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: absoluteUrl("/blog"),
      },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    // The category's accent (--acc) for the whole page: bar, pills, bullets, links.
    <main className={categoryAccent(post.category.slug)}>
      <ReadingProgress targetId={PROSE_ID} />
      <JsonLd value={articleJsonLd} />
      <JsonLd value={breadcrumbJsonLd} />

      <article aria-labelledby="artigo-titulo">
        <header
          id="topo"
          className="relative overflow-hidden px-[clamp(20px,4vw,40px)] pb-[clamp(36px,5vw,56px)] pt-[clamp(116px,14vh,150px)]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_50%_0%,rgb(var(--acc)/.08),transparent_70%)] dark:bg-[radial-gradient(45%_55%_at_50%_0%,rgb(var(--acc)/.12),transparent_70%)]"
          />
          <div className="relative mx-auto flex max-w-[860px] flex-col items-center gap-[22px] text-center">
            <nav
              aria-label="Trilha de navegação"
              className="flex animate-[tpUp_.7s_cubic-bezier(.22,1,.36,1)_both] flex-wrap items-center justify-center gap-2.5"
            >
              <Link
                href="/blog"
                className="group/arrow inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-full border border-site-line2 bg-site-surface py-[7px] pl-[9px] pr-3 text-[13px] font-medium outline-none transition-colors hover:border-site-ink focus-visible:ring-2 focus-visible:ring-site-ink/40"
              >
                <MovingArrow direction="back" size={15} />
                Blog
              </Link>
              <Link
                href={`/blog?category=${post.category.slug}`}
                rel="nofollow"
                className="inline-flex min-h-[36px] items-center gap-2 whitespace-nowrap rounded-full bg-[rgb(var(--acc)/.086)] px-3 py-[7px] text-[13px] font-semibold text-[rgb(var(--acc))] outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40 dark:bg-[rgb(var(--acc)/.15)]"
              >
                <span
                  aria-hidden
                  className="size-[7px] rounded-full bg-[rgb(var(--acc))]"
                />
                {post.category.title}
              </Link>
            </nav>

            {post.draft ? (
              <p className="m-0 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                Rascunho: visível só no ambiente de desenvolvimento.
              </p>
            ) : null}

            <h1
              id="artigo-titulo"
              className="m-0 animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_.05s_both] font-site-display text-[clamp(36px,5.2vw,68px)] font-medium leading-[1.02] tracking-[-.04em] [text-wrap:balance]"
            >
              {post.title}
            </h1>
            <p className="m-0 max-w-[680px] animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_.12s_both] text-[clamp(17px,1.5vw,20px)] leading-[1.6] text-site-muted [text-wrap:pretty]">
              {post.description}
            </p>
            <div className="flex animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_.2s_both] flex-wrap items-center justify-center gap-x-[22px] gap-y-2.5 text-sm text-site-muted">
              <span className="inline-flex items-center gap-2.5 font-medium text-site-ink">
                <span
                  aria-hidden
                  className="grid size-[30px] shrink-0 place-items-center rounded-full bg-[#0e0e14]"
                >
                  <LogoMark width={20} />
                </span>
                {post.author}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar aria-hidden className="size-[15px]" />
                <time dateTime={shownDate}>{editorialDate(shownDate)}</time>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock aria-hidden className="size-[15px]" />
                {post.readingTime} min de leitura
              </span>
              <ShareButton title={post.title} description={post.description} />
            </div>
          </div>
        </header>

        <div className="px-[clamp(20px,4vw,40px)] pb-[clamp(56px,8vw,96px)]">
          <div
            className={cn(
              "mx-auto grid max-w-[1160px] grid-cols-[minmax(0,1fr)] items-start gap-[clamp(32px,5vw,72px)]",
              hasToc && "min-[1100px]:grid-cols-[220px_minmax(0,1fr)]",
            )}
          >
            {hasToc ? (
              <EditorialToc
                items={toc}
                variant="article"
                className="hidden min-[1100px]:flex"
              />
            ) : null}

            <div className="w-full min-w-0 max-w-[740px] justify-self-center">
              {hasToc ? (
                <MobileToc
                  items={toc}
                  title="NESTE ARTIGO"
                  className="min-[1100px]:hidden"
                />
              ) : null}

              <div
                id={PROSE_ID}
                className="animate-[tpIn_.8s_cubic-bezier(.22,1,.36,1)_.15s_both]"
              >
                <Content />
              </div>

              {post.tags.length > 0 ? (
                <ul
                  aria-label="Assuntos"
                  className="m-0 mt-10 flex list-none flex-wrap gap-2 border-t border-site-line p-0 pt-6"
                >
                  {post.tags.map((tag) => (
                    <li key={tag}>
                      <Link
                        href={`/blog?tag=${encodeURIComponent(tag)}`}
                        rel="nofollow"
                        className="block whitespace-nowrap rounded-full border border-site-line2 px-3 py-1.5 text-[13px] outline-none transition-colors hover:border-site-ink focus-visible:ring-2 focus-visible:ring-site-ink/40"
                      >
                        #{tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      </article>

      {related.length > 0 ? (
        <section
          aria-labelledby="rel-titulo"
          className="border-t border-site-line bg-site-surface px-[clamp(20px,4vw,40px)] py-[clamp(56px,8vw,96px)]"
        >
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2
                id="rel-titulo"
                className="m-0 font-site-display text-[clamp(30px,3.6vw,46px)] font-medium leading-[1.05] tracking-[-.035em]"
              >
                Continue lendo.
              </h2>
              <Link
                href="/blog"
                className="group/arrow inline-flex items-center gap-2 whitespace-nowrap rounded-sm text-[15px] font-medium underline-offset-[3px] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-site-ink/40"
              >
                Todos os artigos
                <MovingArrow size={17} />
              </Link>
            </div>
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-5 p-0">
              {related.map((item) => (
                <li key={item.slug} className="flex">
                  <RelatedCard post={item} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <EditorialCtaBand className="pt-[clamp(40px,6vw,72px)]" />
    </main>
  );
};

export default BlogPostPage;
