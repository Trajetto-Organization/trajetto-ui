import { ChevronDown } from "lucide-react";

import type { TocItem } from "@/lib/content/types";
import { cn } from "@/lib/utils";

interface MobileTocProps {
  items: TocItem[];
  title: string;
  className?: string;
}

/**
 * The index below the sidebar breakpoint, folded: the design drops the
 * sidebar on narrow screens, and a long article or policy still needs a way
 * to jump to a section. Native <details>, no JavaScript.
 */
const MobileToc = ({ items, title, className }: MobileTocProps) => (
  <details
    className={cn(
      "group mb-9 rounded-[18px] border border-site-line bg-site-surface",
      className,
    )}
  >
    <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 rounded-[18px] px-5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40 [&::-webkit-details-marker]:hidden">
      <span className="font-site-mono text-[11.5px] tracking-[.14em] text-site-muted">
        {title}
      </span>
      <ChevronDown
        aria-hidden
        className="size-4 text-site-muted transition-transform duration-300 group-open:rotate-180"
      />
    </summary>
    <ol className="m-0 flex list-none flex-col border-t border-site-line px-5 py-3">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className={cn(
              "block rounded-sm py-1.5 leading-[1.45] text-site-muted hover:text-site-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40",
              item.level === 3 ? "pl-3.5 text-[13px]" : "text-sm",
            )}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  </details>
);

export { MobileToc };
