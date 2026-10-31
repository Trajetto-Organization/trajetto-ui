"use client";

import {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { categoryDot } from "@/components/site/editorial/category";
import { FeaturedPost } from "@/components/site/editorial/featured-post";
import { PostCard } from "@/components/site/editorial/post-card";

import {
  EMPTY_FILTERS,
  filterPosts,
  paginate,
  readFilters,
  toSearchString,
  type BlogFilters,
} from "@/lib/content/blog-search";
import type { BlogCategoryWithCount, PostMeta } from "@/lib/content/types";
import { cn } from "@/lib/utils";

const URL_SYNC_DELAY_MS = 300;

/**
 * The design shows the featured post plus eleven cards on one screen: twelve
 * per page (the featured one counts), so pages only appear past twelve posts.
 */
const PER_PAGE = 12;

/**
 * Reports URL changes that did not come from us (first load, back/forward, a
 * link such as /blog?tag=x). In its own Suspense boundary so the rest of the
 * blog is still prerendered as static HTML.
 */
function SearchParamsListener({
  onChange,
}: {
  onChange: (params: URLSearchParams) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    onChange(new URLSearchParams(searchParams.toString()));
  }, [searchParams, onChange]);

  return null;
}

interface BlogExplorerProps {
  posts: PostMeta[];
  categories: BlogCategoryWithCount[];
  /** The hero's heading and lead, laid out next to the search like the design. */
  intro: ReactNode;
}

/**
 * Search, filters and pages over the static list of posts, in the browser.
 *
 * /blog is prerendered once, so its HTML is always page 1 with no filter:
 * /blog?page=2 or ?category=x shows that HTML until hydration, and only then
 * this component reads the URL and switches (a brief flash when landing on a
 * filtered link; without JavaScript it stays on page 1). Accepted on
 * purpose: rendering per query would make the blog dynamic, and hiding the
 * list until hydration would delay the canonical page for everyone.
 * Crawlers lose nothing: every post is in the sitemap and the canonical is
 * /blog. Filters and pages are still real links, so a middle click or
 * "open in new tab" works.
 */
const BlogExplorer = ({ posts, categories, intro }: BlogExplorerProps) => {
  const [filters, setFilters] = useState<BlogFilters>(EMPTY_FILTERS);
  // Bumped on every filter change: the cards remount and replay their entrance.
  const [generation, setGeneration] = useState(0);

  const resultsRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchId = useId();

  // Last query string written to (or read from) the URL, to ignore the echo
  // of our own history updates while the user is typing.
  const syncedSearch = useRef("");

  const onUrlChange = useCallback((params: URLSearchParams) => {
    const search = params.toString() ? `?${params.toString()}` : "";
    if (search === syncedSearch.current) return;

    syncedSearch.current = search;
    setFilters(readFilters(params));
  }, []);

  // State -> URL; replace (not push) so Back leaves the blog instead of
  // undoing letters. Only typing is debounced. A chip, a tag or a page is a
  // link, and the top loader starts its bar on the click of any link to
  // another URL, then finishes it when the URL changes: written on the next
  // task (after that click has finished dispatching), the bar completes at
  // once. With the typing delay it crawled for 300 ms, and before
  // nextjs-toploader 3 (which also finishes on replaceState) it never
  // stopped.
  useEffect(() => {
    const search = toSearchString(filters);
    if (search === syncedSearch.current) return;

    const typed =
      readFilters(new URLSearchParams(syncedSearch.current)).query.trim() !==
      filters.query.trim();

    const timeout = setTimeout(
      () => {
        syncedSearch.current = search;
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${search}`,
        );
      },
      typed ? URL_SYNC_DELAY_MS : 0,
    );

    return () => clearTimeout(timeout);
  }, [filters]);

  // "/" focuses the search, as the kbd hint promises.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
        return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      )
        return;

      event.preventDefault();
      searchRef.current?.focus();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const query = useDeferredValue(filters.query);

  // Search and tag narrow everything; the chips count inside that.
  const byQuery = useMemo(
    () => filterPosts(posts, { query, category: "", tag: filters.tag }),
    [posts, query, filters.tag],
  );
  const results = useMemo(
    () =>
      filters.category
        ? byQuery.filter((post) => post.category.slug === filters.category)
        : byQuery,
    [byQuery, filters.category],
  );

  const hasFilters = Boolean(
    filters.query.trim() || filters.category || filters.tag,
  );

  // Unfiltered, the featured post leads page 1 in its own large card.
  const ordered = useMemo(() => {
    if (hasFilters) return results;

    const featured = results.find((post) => post.featured);
    return featured
      ? [featured, ...results.filter((post) => post !== featured)]
      : results;
  }, [results, hasFilters]);

  const page = paginate(ordered, filters.page, PER_PAGE);
  const lead =
    !hasFilters && page.page === 1 && page.items[0]?.featured
      ? page.items[0]
      : null;
  const cards = lead ? page.items.slice(1) : page.items;

  const update = (patch: Partial<BlogFilters>) => {
    setFilters((current) => ({ ...current, page: 1, ...patch }));
    setGeneration((value) => value + 1);
  };

  const hrefFor = (patch: Partial<BlogFilters>) =>
    `/blog${toSearchString({ ...filters, page: 1, ...patch })}`;

  /** Plain clicks stay in the page; modified clicks open the link as usual. */
  const intercept =
    (apply: () => void) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.button !== 0
      )
        return;

      event.preventDefault();
      apply();
    };

  const goToPage = (target: number) => {
    setFilters((current) => ({ ...current, page: target }));
    setGeneration((value) => value + 1);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    resultsRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  const resetAll = () => {
    setFilters(EMPTY_FILTERS);
    setGeneration((value) => value + 1);
  };

  const resultLabel = hasFilters
    ? `${results.length} ${results.length === 1 ? "artigo encontrado" : "artigos encontrados"}`
    : `${results.length} ${results.length === 1 ? "artigo" : "artigos"}`;

  const chips = [
    { slug: "", title: "Todos", count: byQuery.length },
    ...categories.map((category) => ({
      slug: category.slug,
      title: category.title,
      count: byQuery.filter((post) => post.category.slug === category.slug)
        .length,
    })),
  ];

  const pageLink =
    "flex h-11 min-w-11 items-center justify-center gap-1 rounded-xl border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-site-ink/40";

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsListener onChange={onUrlChange} />
      </Suspense>

      <section
        aria-labelledby="blog-titulo"
        className="relative overflow-hidden px-[clamp(20px,4vw,40px)] pb-[clamp(28px,4vw,44px)] pt-[clamp(120px,15vh,160px)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_50%_at_85%_10%,var(--site-glow-a),transparent_70%),radial-gradient(35%_45%_at_10%_90%,var(--site-glow-b),transparent_70%)]"
        />
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] items-end gap-x-16 gap-y-8">
          <div className="flex animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_both] flex-col gap-[22px]">
            {intro}
          </div>

          <div className="flex animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_.1s_both] flex-col gap-[18px]">
            <p className="m-0 max-w-[480px] text-[clamp(17px,1.4vw,19px)] leading-[1.6] text-site-muted [text-wrap:pretty]">
              Artigos práticos sobre a rotina da frota, da entrega e da operação
              em campo, escritos pela equipe que constrói o Trajetto.
            </p>
            <form
              role="search"
              onSubmit={(event) => event.preventDefault()}
              className="relative flex h-14 items-center rounded-2xl border border-site-line2 bg-site-surface shadow-[0_10px_30px_-22px_rgba(14,14,30,.35)] transition-[border-color,box-shadow] [transition-duration:250ms] focus-within:border-site-ink focus-within:shadow-[0_0_0_4px_var(--site-violet-soft)]"
            >
              <Search
                aria-hidden
                className="pointer-events-none absolute left-[18px] size-[18px] text-site-muted"
              />
              <label htmlFor={searchId} className="sr-only">
                Buscar artigos
              </label>
              <input
                ref={searchRef}
                id={searchId}
                type="search"
                value={filters.query}
                onChange={(event) => update({ query: event.target.value })}
                placeholder="Buscar por assunto, como canhoto, multas ou webhooks"
                autoComplete="off"
                enterKeyHint="search"
                className="h-full min-w-0 flex-1 rounded-2xl border-0 bg-transparent pl-[50px] pr-[52px] text-[15.5px] text-site-ink outline-none placeholder:text-site-muted/75 [&::-webkit-search-cancel-button]:appearance-none"
              />
              {filters.query ? (
                <button
                  type="button"
                  onClick={() => {
                    update({ query: "" });
                    searchRef.current?.focus();
                  }}
                  aria-label="Limpar busca"
                  className="absolute right-2.5 flex size-9 animate-[tpIn_.25s_ease_both] items-center justify-center rounded-[10px] bg-site-soft2 outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40"
                >
                  <X aria-hidden className="size-4" />
                </button>
              ) : (
                <kbd
                  aria-hidden
                  className="pointer-events-none absolute right-3.5 hidden rounded-[7px] border border-site-line2 px-2 py-[3px] font-site-mono text-[11.5px] text-site-muted sm:block"
                >
                  /
                </kbd>
              )}
            </form>
          </div>
        </div>

        {categories.length > 0 ? (
          <nav
            aria-label="Filtrar por categoria"
            className="relative mx-auto mt-[clamp(32px,4vw,44px)] flex max-w-[1200px] animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_.18s_both] flex-wrap gap-2"
          >
            {chips.map((chip) => {
              const active = filters.category === chip.slug;

              return (
                <a
                  key={chip.slug || "todos"}
                  href={hrefFor({ category: chip.slug })}
                  rel="nofollow"
                  aria-current={active ? "true" : undefined}
                  onClick={intercept(() => update({ category: chip.slug }))}
                  className={cn(
                    "inline-flex min-h-[40px] items-center gap-[9px] whitespace-nowrap rounded-full border py-[9px] pl-3 pr-3.5 text-sm font-medium outline-none",
                    "transition-[background-color,border-color,color,transform] [transition-duration:250ms] active:scale-[.97] focus-visible:ring-2 focus-visible:ring-site-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-site-bg",
                    active
                      ? "border-site-ink bg-site-ink text-site-bg"
                      : "border-site-line2 bg-site-surface text-site-ink hover:border-site-ink/40",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 rounded-full",
                      chip.slug
                        ? categoryDot(chip.slug)
                        : active
                          ? "bg-site-bg"
                          : "bg-site-ink",
                    )}
                  />
                  {chip.title}
                  <span className="font-site-mono text-[11.5px] opacity-65">
                    <span className="sr-only">(</span>
                    {chip.count}
                    <span className="sr-only">)</span>
                  </span>
                </a>
              );
            })}
          </nav>
        ) : null}
      </section>

      <section
        ref={resultsRef}
        aria-labelledby="blog-results-title"
        className="scroll-mt-24 px-[clamp(20px,4vw,40px)] pb-[clamp(64px,8vw,104px)]"
      >
        <h2 id="blog-results-title" className="sr-only">
          {hasFilters ? "Resultados" : "Todos os artigos"}
        </h2>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-[clamp(20px,3vw,28px)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-site-line pt-[18px] text-sm text-site-muted">
            <p
              className="m-0 flex flex-wrap items-center gap-2"
              aria-live="polite"
            >
              {resultLabel}
              {filters.tag ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-site-line2 bg-site-surface py-0.5 pl-2.5 pr-1 text-[13px] text-site-ink">
                  #{filters.tag}
                  <button
                    type="button"
                    onClick={() => update({ tag: "" })}
                    aria-label={`Remover o assunto ${filters.tag}`}
                    className="flex size-6 items-center justify-center rounded-full outline-none hover:bg-site-soft2 focus-visible:ring-2 focus-visible:ring-site-ink/40"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                </span>
              ) : null}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={resetAll}
                className="rounded-sm border-0 bg-transparent text-sm font-medium text-site-ink underline underline-offset-[3px] outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>

          {lead ? (
            <FeaturedPost key={`${generation}-${lead.slug}`} post={lead} />
          ) : null}

          {cards.length > 0 ? (
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-5 p-0">
              {cards.map((post, index) => (
                <li key={`${generation}-${post.slug}`} className="flex">
                  <PostCard
                    post={post}
                    delay={(index % 9) * 60}
                    className="w-full"
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {page.items.length === 0 ? (
            <div className="flex animate-[tpIn_.5s_ease_both] flex-col items-center gap-3 rounded-[26px] border border-dashed border-site-line2 px-6 py-[72px] text-center">
              <span
                aria-hidden
                className="flex size-[52px] items-center justify-center rounded-2xl bg-site-soft2 text-site-muted"
              >
                <Search className="size-[22px]" />
              </span>
              <p className="m-0 text-lg font-semibold">
                {posts.length === 0
                  ? "Nenhum artigo publicado ainda"
                  : "Nenhum artigo encontrado"}
              </p>
              <p className="m-0 max-w-[380px] text-[15px] text-site-muted">
                {posts.length === 0
                  ? "Os primeiros artigos estão sendo escritos."
                  : "Tente outra palavra ou veja todas as categorias."}
              </p>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={resetAll}
                  className="mt-2 min-h-[44px] rounded-xl border border-site-line2 bg-site-surface px-[18px] py-[11px] font-medium outline-none transition-colors hover:border-site-ink/40 focus-visible:ring-2 focus-visible:ring-site-ink/40"
                >
                  Ver todos os artigos
                </button>
              ) : null}
            </div>
          ) : null}

          {page.totalPages > 1 ? (
            <nav
              aria-label="Paginação"
              className="flex flex-wrap items-center justify-center gap-2 pt-2"
            >
              {page.page > 1 ? (
                <a
                  href={`/blog${toSearchString({ ...filters, page: page.page - 1 })}`}
                  rel="prev"
                  onClick={intercept(() => goToPage(page.page - 1))}
                  className={cn(
                    pageLink,
                    "border-site-line2 bg-site-surface text-site-ink hover:border-site-ink/40",
                  )}
                >
                  <ChevronLeft aria-hidden className="size-4" />
                  Anterior
                </a>
              ) : null}
              {Array.from(
                { length: page.totalPages },
                (_, index) => index + 1,
              ).map((number) => (
                <a
                  key={number}
                  href={`/blog${toSearchString({ ...filters, page: number })}`}
                  aria-label={`Página ${number}`}
                  aria-current={number === page.page ? "page" : undefined}
                  onClick={intercept(() => goToPage(number))}
                  className={cn(
                    pageLink,
                    "font-site-mono",
                    number === page.page
                      ? "border-site-ink bg-site-ink text-site-bg"
                      : "border-site-line2 bg-site-surface text-site-ink hover:border-site-ink/40",
                  )}
                >
                  {number}
                </a>
              ))}
              {page.page < page.totalPages ? (
                <a
                  href={`/blog${toSearchString({ ...filters, page: page.page + 1 })}`}
                  rel="next"
                  onClick={intercept(() => goToPage(page.page + 1))}
                  className={cn(
                    pageLink,
                    "border-site-line2 bg-site-surface text-site-ink hover:border-site-ink/40",
                  )}
                >
                  Próxima
                  <ChevronRight aria-hidden className="size-4" />
                </a>
              ) : null}
            </nav>
          ) : null}
        </div>
      </section>
    </>
  );
};

export { BlogExplorer };
