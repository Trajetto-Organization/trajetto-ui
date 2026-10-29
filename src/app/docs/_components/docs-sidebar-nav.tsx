"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";

import { DOCS_SECTIONS, hrefOf } from "../_lib/navigation";

interface DocsSidebarNavProps {
  /** Closes the phone menu after a click. */
  onNavigate?: () => void;
  /** "compact" in the desktop column; "touch" (48px rows) in the phone menu. */
  density?: "compact" | "touch";
}

/** The portal's sections, shared by the desktop column and the phone menu. */
const DocsSidebarNav = ({
  onNavigate,
  density = "compact",
}: DocsSidebarNavProps) => {
  const pathname = usePathname();
  const touch = density === "touch";

  return (
    <nav
      aria-label="Documentação"
      className={cn("flex flex-col text-sm", touch ? "gap-3" : "gap-7")}
    >
      {DOCS_SECTIONS.map((section) => (
        <div key={section.title}>
          {/* The site's small menu label (the phone menu's "PRODUTOS"). */}
          <p className="mx-3 mb-1.5 mt-1 font-site-mono text-[11px] font-medium uppercase tracking-[.12em] text-site-muted">
            {section.title}
          </p>

          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const href = hrefOf(item);
              const active = pathname === href;
              const external = item.kind === "console";

              const className = cn(
                "flex items-center justify-between gap-2 px-3 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-site-ink/40",
                touch
                  ? "min-h-[48px] rounded-[12px] text-[15px]"
                  : "rounded-[10px] py-[7px]",
                active
                  ? "bg-site-soft2 font-medium text-site-ink"
                  : "text-site-muted hover:bg-site-soft hover:text-site-ink",
              );

              return (
                <li key={href}>
                  {external ? (
                    // A plain anchor: the console is a redirect to the API,
                    // and a prefetch would follow it to another origin.
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onNavigate}
                      className={className}
                    >
                      <span className="truncate">{item.title}</span>
                      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                      <span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  ) : (
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={className}
                    >
                      <span className="truncate">{item.title}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
};

export { DocsSidebarNav };
