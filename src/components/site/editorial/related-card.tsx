import Link from "next/link";

import type { PostMeta } from "@/lib/content/types";
import { cn } from "@/lib/utils";

import { CategoryIcon, categoryAccent } from "./category";

/** A post under "Continue lendo." (the article's related posts). */
const RelatedCard = ({ post }: { post: PostMeta }) => (
  <Link
    href={`/blog/${post.slug}`}
    className={cn(
      categoryAccent(post.category.slug),
      "flex h-full w-full flex-col gap-3 rounded-[22px] border border-site-line bg-site-bg p-6 outline-none",
      "transition-[transform,border-color] [transition-duration:400ms] ease-site hover:-translate-y-1 hover:border-site-line2 motion-reduce:hover:translate-y-0",
      "focus-visible:ring-2 focus-visible:ring-site-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-site-surface",
    )}
  >
    <div className="flex items-center justify-between gap-3">
      <span
        aria-hidden
        className="flex size-[42px] items-center justify-center rounded-[13px] bg-[rgb(var(--acc))] text-white"
      >
        <CategoryIcon icon={post.category.icon} width={20} height={20} />
      </span>
      <span className="whitespace-nowrap font-site-mono text-[11.5px] text-site-muted">
        {post.readingTime} min
      </span>
    </div>
    <span className="text-[12.5px] font-semibold text-[rgb(var(--acc))]">
      {post.category.title}
    </span>
    <h3 className="m-0 text-lg font-semibold leading-[1.3] tracking-[-.015em] [text-wrap:pretty]">
      {post.title}
    </h3>
  </Link>
);

export { RelatedCard };
