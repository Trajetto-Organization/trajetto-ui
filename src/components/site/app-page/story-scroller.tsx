"use client";

import { useEffect, useRef, useState } from "react";

import { Check } from "lucide-react";

import { PhoneMockup } from "@/components/site/phone-mockup";
import { cn } from "@/lib/utils";

import {
  MODULE_BG,
  MODULE_SOFT_BG,
  MODULE_SOFT_VAR,
  MODULE_TEXT,
  STORY,
} from "./content";

/**
 * "Um dia no app", from 900px: the phone stays sticky on the left while the
 * steps scroll on the right; the step nearest the middle of the viewport
 * picks the phone's screen, the glow and the progress dots, and the other
 * steps dim (design: `data-story`).
 *
 * Before hydration (and without JavaScript) every step is fully readable;
 * the dimming only starts once the scroll is tracked.
 */
const StoryScroller = (): JSX.Element => {
  const listRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      // Hidden below 900px (the stacked cards take over): nothing to track.
      if (list.offsetParent === null) return;
      const middle = window.innerHeight / 2;
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      Array.from(list.children).forEach((child, index) => {
        const rect = child.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - middle);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      });
      setStep(best);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    setTracking(true);
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const current = STORY[step] ?? STORY[0];

  return (
    <div className="hidden grid-cols-2 gap-[clamp(40px,6vw,96px)] min-[900px]:grid">
      <div className="relative">
        <div className="sticky top-[calc(50vh-300px)] flex h-[600px] items-center justify-center gap-7">
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -ml-[240px] -mt-[240px] size-[480px] rounded-full transition-[background] duration-700"
            style={{
              background: `radial-gradient(closest-side, ${MODULE_SOFT_VAR[current.module]}, transparent)`,
            }}
          />
          <div className="relative w-[280px]">
            <PhoneMockup screen={current.screen} />
          </div>
          <ol
            aria-hidden
            className="relative m-0 flex list-none flex-col gap-2 p-0"
          >
            {STORY.map((item, index) => (
              <li
                key={item.screen}
                className={cn(
                  "w-1.5 rounded-full transition-[height,background-color] duration-500 ease-site",
                  index === step
                    ? cn("h-7", MODULE_BG[item.module])
                    : "h-1.5 bg-site-line2",
                )}
              />
            ))}
          </ol>
        </div>
      </div>
      <div ref={listRef}>
        {STORY.map((item, index) => (
          <article
            key={item.screen}
            data-dim={tracking && index !== step ? "true" : "false"}
            className="group flex min-h-[78vh] flex-col justify-center gap-4"
          >
            <span
              className={cn(
                "inline-flex items-center gap-2 self-start whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-[background-color,color] duration-500",
                MODULE_SOFT_BG[item.module],
                MODULE_TEXT[item.module],
                "group-data-[dim=true]:bg-site-soft2 group-data-[dim=true]:text-site-muted",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-[7px]",
                  item.module === "f" ? "rounded-[2px]" : "rounded-full",
                  MODULE_BG[item.module],
                )}
              />
              {item.moduleLabel}
            </span>
            <h3 className="m-0 font-site-display text-[clamp(30px,3.4vw,44px)] font-medium leading-[1.05] tracking-[-.03em] transition-colors duration-500 [text-wrap:balance] group-data-[dim=true]:text-site-muted">
              {item.title}
            </h3>
            <p className="m-0 max-w-[480px] text-[17px] leading-[1.6] text-site-muted [text-wrap:pretty]">
              {item.description}
            </p>
            <ul className="m-0 mt-1.5 flex list-none flex-col p-0">
              {item.points.map((point) => (
                <li
                  key={point}
                  className="flex gap-2.5 border-t border-site-line py-2.5 text-[15px] transition-colors duration-500 group-data-[dim=true]:text-site-muted"
                >
                  <Check
                    aria-hidden
                    strokeWidth={2.4}
                    className={cn(
                      "mt-0.5 size-4 shrink-0 transition-opacity duration-500 group-data-[dim=true]:opacity-40",
                      MODULE_TEXT[item.module],
                    )}
                  />
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
};

export { StoryScroller };
