"use client";

import { useRef, type MouseEvent } from "react";

import Link from "next/link";

import { MovingArrow } from "@/components/site/arrow-link";

import { editorialDate } from "./date";
import type { PostMeta } from "@/lib/content/types";
import { cn } from "@/lib/utils";

import { CategoryIcon, categoryAccent } from "./category";
import { readingLabel } from "./post-card";

/**
 * The featured post on top of the blog (unfiltered page 1). The icon follows
 * the pointer a little (the design's tilt); a fine pointer only, and never
 * under reduced motion.
 */
const FeaturedPost = ({ post }: { post: PostMeta }) => {
  const tiltRef = useRef<HTMLDivElement>(null);

  const tilt = (event: MouseEvent<HTMLAnchorElement>) => {
    const el = tiltRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `translate3d(${(x * 22).toFixed(1)}px,${(y * 18).toFixed(1)}px,0) rotate(${(x * 6).toFixed(1)}deg)`;
  };

  const untilt = () => {
    if (tiltRef.current) tiltRef.current.style.transform = "";
  };

  return (
    <Link
      href={`/blog/${post.slug}`}
      onMouseMove={tilt}
      onMouseLeave={untilt}
      className={cn(
        categoryAccent(post.category.slug),
        "group/arrow grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] overflow-hidden rounded-[30px] border border-site-line bg-site-surface outline-none",
        "animate-[tpIn_.7s_cubic-bezier(.22,1,.36,1)_both] transition-[transform,box-shadow] [transition-duration:450ms] ease-site",
        "hover:-translate-y-1 hover:shadow-[0_40px_80px_-48px_rgba(14,14,30,.45)] motion-reduce:hover:translate-y-0",
        "focus-visible:ring-2 focus-visible:ring-site-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-site-bg",
      )}
    >
      <div
        aria-hidden
        className="relative min-h-[340px] overflow-hidden bg-[linear-gradient(135deg,rgb(var(--acc)/.1),rgb(var(--acc)/.03))] dark:bg-[linear-gradient(135deg,rgb(var(--acc)/.16),rgb(var(--acc)/.04))]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(rgb(var(--acc)/.28)_1.2px,transparent_1.2px)] bg-[length:22px_22px] [-webkit-mask-image:radial-gradient(70%_70%_at_50%_50%,#000,transparent)] [mask-image:radial-gradient(70%_70%_at_50%_50%,#000,transparent)] dark:bg-[radial-gradient(rgb(var(--acc)/.35)_1.2px,transparent_1.2px)]" />
        <div
          ref={tiltRef}
          className="absolute inset-0 flex items-center justify-center transition-transform [transition-duration:600ms] ease-site"
        >
          <span className="flex size-32 items-center justify-center rounded-[36px] bg-[rgb(var(--acc))] text-white shadow-[0_30px_60px_-20px_rgb(var(--acc))]">
            <CategoryIcon
              icon={post.category.icon}
              width={54}
              height={54}
              strokeWidth={1.7}
            />
          </span>
        </div>
        <span className="absolute left-[22px] top-[22px] inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-site-surface px-3 py-[7px] text-[12.5px] font-semibold">
          ★ Em destaque
        </span>
      </div>

      <div className="flex flex-col justify-center gap-[18px] p-[clamp(28px,4vw,48px)]">
        <span className="inline-flex items-center gap-2 self-start text-[13px] font-semibold text-[rgb(var(--acc))]">
          <span
            aria-hidden
            className="size-2 rounded-full bg-[rgb(var(--acc))]"
          />
          {post.category.title}
        </span>
        <h2 className="m-0 font-site-display text-[clamp(28px,3.4vw,44px)] font-medium leading-[1.06] tracking-[-.03em] [text-wrap:balance]">
          {post.title}
        </h2>
        <p className="m-0 text-[16.5px] leading-[1.6] text-site-muted [text-wrap:pretty]">
          {post.description}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-site-line pt-[18px]">
          <span className="text-[13.5px] text-site-muted">
            {post.author} ·{" "}
            <time dateTime={post.date}>{editorialDate(post.date)}</time> ·{" "}
            {readingLabel(post)}
          </span>
          <span className="inline-flex items-center gap-2 whitespace-nowrap text-[14.5px] font-semibold">
            Ler artigo
            <MovingArrow size={18} />
          </span>
        </div>
      </div>
    </Link>
  );
};

export { FeaturedPost };
