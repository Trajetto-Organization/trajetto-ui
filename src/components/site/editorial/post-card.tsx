import type { CSSProperties, ElementType } from "react";

import Link from "next/link";

import { editorialDate } from "./date";
import type { PostMeta } from "@/lib/content/types";
import { cn } from "@/lib/utils";

import { CategoryIcon, categoryAccent } from "./category";

/** "9 min de leitura". */
function readingLabel(post: PostMeta): string {
  return `${post.readingTime} min de leitura`;
}

// Cover of the cards (no images, decision 10.1): the category's tint, a dot
// grid fading in from the left and the icon tile. Light and dark strengths
// are the design's (.1/.03 and .16/.04; dots .28 and .35).
const COVER =
  "bg-[linear-gradient(135deg,rgb(var(--acc)/.1),rgb(var(--acc)/.03))] dark:bg-[linear-gradient(135deg,rgb(var(--acc)/.16),rgb(var(--acc)/.04))]";

interface PostCardProps {
  post: PostMeta;
  /** Stagger of the entrance, ms (the design: (i % 9) * 60). */
  delay?: number;
  headingLevel?: ElementType;
  className?: string;
}

/** A post in the blog grid (Trajetto Blog.dc.html, the 340px cards). */
const PostCard = ({
  post,
  delay = 0,
  headingLevel: Heading = "h3",
  className,
}: PostCardProps) => (
  <Link
    href={`/blog/${post.slug}`}
    style={
      delay ? ({ animationDelay: `${delay}ms` } as CSSProperties) : undefined
    }
    className={cn(
      categoryAccent(post.category.slug),
      "group flex h-full flex-col overflow-hidden rounded-[24px] border border-site-line bg-site-surface outline-none",
      "animate-tp-in transition-[transform,box-shadow,border-color] [transition-duration:400ms] ease-site",
      "hover:-translate-y-1 hover:border-site-line2 hover:shadow-[0_30px_60px_-40px_rgba(14,14,30,.45)] motion-reduce:hover:translate-y-0",
      "focus-visible:ring-2 focus-visible:ring-site-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-site-bg",
      className,
    )}
  >
    <div
      aria-hidden
      className={cn("relative h-[168px] shrink-0 overflow-hidden", COVER)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(rgb(var(--acc)/.28)_1px,transparent_1px)] bg-[length:18px_18px] [-webkit-mask-image:linear-gradient(115deg,transparent_20%,#000_90%)] [mask-image:linear-gradient(115deg,transparent_20%,#000_90%)] dark:bg-[radial-gradient(rgb(var(--acc)/.35)_1px,transparent_1px)]" />
      <span className="absolute bottom-5 left-5 flex size-14 items-center justify-center rounded-[17px] bg-[rgb(var(--acc))] text-white shadow-[0_16px_30px_-14px_rgb(var(--acc))]">
        <CategoryIcon
          icon={post.category.icon}
          width={24}
          height={24}
          strokeWidth={2}
        />
      </span>
      <span className="absolute right-[18px] top-[18px] whitespace-nowrap rounded-full bg-site-surface px-2.5 py-[5px] font-site-mono text-[11px] tracking-[.04em]">
        {readingLabel(post)}
      </span>
    </div>

    <div className="flex flex-1 flex-col gap-2.5 px-[22px] pb-5 pt-[22px]">
      <span className="text-[12.5px] font-semibold text-[rgb(var(--acc))]">
        {post.category.title}
        {post.draft ? (
          <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
            Rascunho
          </span>
        ) : null}
      </span>
      <Heading className="m-0 text-[19px] font-semibold leading-[1.3] tracking-[-.015em] [text-wrap:pretty]">
        {post.title}
      </Heading>
      <p className="m-0 line-clamp-3 text-[14.5px] leading-[1.55] text-site-muted">
        {post.description}
      </p>
      <span className="mt-auto pt-3.5 text-[13px] text-site-muted">
        <time dateTime={post.date}>{editorialDate(post.date)}</time>
      </span>
    </div>
  </Link>
);

export { PostCard, readingLabel };
