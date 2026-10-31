import Link from "next/link";

import { MovingArrow } from "@/components/site/arrow-link";
import { cn } from "@/lib/utils";

import { adjacentPages, type PagerLink } from "../_lib/navigation";

/**
 * Previous and next page, in the menu's reading order, as the site's cards
 * (the legal pages' "Leia também"): label and title, an arrow that slides on
 * hover and keyboard focus, the card lifting 3px (still under reduced motion).
 */

const CARD =
  "group/arrow flex h-full items-center gap-3.5 rounded-[18px] border border-site-line bg-site-surface px-5 py-[18px] text-site-ink outline-none " +
  "transition-[transform,border-color] [transition-duration:350ms] ease-site hover:-translate-y-[3px] hover:border-site-line2 motion-reduce:hover:translate-y-0 " +
  "focus-visible:ring-2 focus-visible:ring-site-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-site-bg";

const PagerCard = ({
  page,
  direction,
}: {
  page: PagerLink;
  direction: "previous" | "next";
}) => {
  const previous = direction === "previous";

  return (
    <Link
      href={page.href}
      rel={previous ? "prev" : "next"}
      data-pager={direction}
      className={cn(CARD, !previous && "flex-row-reverse text-right")}
    >
      {/* The previous card's arrow points back and slides left. */}
      <MovingArrow size={17} direction={previous ? "back" : "forward"} />
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] text-site-muted">
          {previous ? "Anterior" : "Próximo"}
        </span>
        <span className="block text-[15px] font-semibold leading-snug [text-wrap:pretty]">
          {page.title}
        </span>
      </span>
    </Link>
  );
};

const DocsPager = ({ href }: { href: string }) => {
  const { previous, next } = adjacentPages(href);

  if (!previous && !next) return null;

  return (
    <nav
      aria-label="Páginas vizinhas"
      className="mt-16 grid grid-cols-1 gap-3 border-t border-site-line pt-8 sm:grid-cols-2"
    >
      {previous ? (
        <PagerCard page={previous} direction="previous" />
      ) : (
        <span aria-hidden className="hidden sm:block" />
      )}
      {next ? <PagerCard page={next} direction="next" /> : null}
    </nav>
  );
};

export { DocsPager };
