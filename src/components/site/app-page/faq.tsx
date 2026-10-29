"use client";

import { useId, useState } from "react";

import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

import type { FaqEntry } from "./content";

/**
 * Accordion of the FAQ (one open at a time, the first open on load, like
 * the design). The answers stay in the HTML when closed: the rows collapse
 * with grid-template-rows, so the text is still there for crawlers and the
 * height animates without measuring.
 */
const AppFaq = ({ items }: { items: readonly FaqEntry[] }): JSX.Element => {
  const [open, setOpen] = useState(0);
  const baseId = useId();

  return (
    <div className="border-t border-site-line">
      {items.map((item, index) => {
        const isOpen = open === index;
        const buttonId = `${baseId}-q${index}`;
        const panelId = `${baseId}-a${index}`;

        return (
          <div key={item.question} className="border-b border-site-line">
            <h3 className="m-0">
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? -1 : index)}
                className="group flex w-full cursor-pointer items-center justify-between gap-5 rounded-md border-0 bg-transparent py-[22px] text-left text-[17px] font-semibold leading-[1.4] outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40"
              >
                <span>{item.question}</span>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border border-site-line2 transition-[transform,background-color,color] [transition-duration:450ms] ease-site",
                    isOpen
                      ? "rotate-45 bg-site-ink text-site-bg"
                      : "bg-transparent text-site-ink",
                  )}
                >
                  <Plus className="size-4" />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              aria-hidden={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows] duration-500 ease-site",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <p
                  className={cn(
                    "m-0 pb-6 pr-12 text-[15.5px] leading-[1.65] text-site-muted transition-opacity [transition-duration:400ms] [text-wrap:pretty]",
                    isOpen ? "opacity-100" : "opacity-0",
                  )}
                >
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export { AppFaq };
