"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { ArrowLink } from "@/components/site/arrow-link";
import { PhoneMockup } from "@/components/site/phone-mockup";
import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

import { PRODUCTS, type ProductModule } from "./content";
import { prefersReducedMotion } from "./motion";

/** Time on each screen while the tour plays (the design's 5200ms). */
const DWELL = 5200;

/**
 * "App do motorista": three tabs drive the phone. While the section is in
 * view the tabs advance on their own, with a progress line under the current
 * one; hovering the list pauses, picking a tab stops the tour for good, and
 * reduced motion never starts it. Arrow keys move between tabs.
 */
const ProductApp = ({ module }: { module: ProductModule }): JSX.Element => {
  const product = PRODUCTS[module];
  const tabs = product.app;
  const sectionRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [chosen, setChosen] = useState(false);
  const [hover, setHover] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;
    // In view = between 15% and 85% of the viewport, like the design.
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      {
        rootMargin: "-15% 0px -15% 0px",
      },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const playing = !chosen && !hover && inView && !reduced;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => setCurrent((index) => (index + 1) % tabs.length),
      DWELL,
    );
    return () => window.clearTimeout(timer);
  }, [playing, current, tabs.length]);

  const pick = (index: number) => {
    setCurrent(index);
    setChosen(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = tabs.length - 1;
    const next =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? current === last
          ? 0
          : current + 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? current === 0
            ? last
            : current - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    pick(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      ref={sectionRef}
      id="app"
      aria-labelledby="app-titulo"
      className="relative overflow-hidden border-y border-site-line bg-site-surface px-[clamp(20px,4vw,40px)] py-[clamp(72px,10vw,128px)]"
    >
      <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-[clamp(40px,6vw,96px)]">
        <div className="min-w-0">
          <Reveal>
            <Eyebrow className="mb-4">APP DO MOTORISTA</Eyebrow>
            <SectionHeading id="app-titulo">{product.appTitle}</SectionHeading>
            <p className="mb-0 mt-5 max-w-[500px] text-[17px] leading-[1.6] text-site-muted [text-wrap:pretty]">
              {product.appDescription}
            </p>
          </Reveal>

          <Reveal
            delay={100}
            role="tablist"
            aria-label="Telas do app do motorista"
            aria-orientation="vertical"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onKeyDown={onKeyDown}
            className="mt-9 flex flex-col gap-1"
          >
            {tabs.map((tab, index) => {
              const active = index === current;

              return (
                <button
                  key={tab.screen}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`app-tab-${index}`}
                  aria-selected={active}
                  aria-controls="app-tela"
                  tabIndex={active ? 0 : -1}
                  onClick={() => pick(index)}
                  className={cn(
                    "relative flex gap-3.5 overflow-hidden rounded-[14px] border px-[18px] py-4 text-left outline-none transition-[background-color,border-color] duration-300",
                    "focus-visible:ring-2 focus-visible:ring-site-ink/40",
                    active
                      ? "border-site-line2 bg-site-bg"
                      : "border-transparent bg-transparent hover:bg-site-bg/60",
                  )}
                >
                  <span className="pt-0.5 font-site-mono text-[11.5px] text-site-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15.5px] font-semibold">
                      {tab.title}
                    </span>
                    <span
                      className={cn(
                        "grid transition-[grid-template-rows] [transition-duration:450ms] ease-site",
                        active ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                    >
                      <span className="block min-h-0 overflow-hidden text-sm leading-[1.5] text-site-muted">
                        <span className="block pt-1">{tab.description}</span>
                      </span>
                    </span>
                  </span>
                  {active && playing ? (
                    <span
                      key={`progress-${current}`}
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-[tpProgress_5200ms_linear_both] bg-[var(--acc)]"
                    />
                  ) : null}
                </button>
              );
            })}
          </Reveal>

          <ArrowLink href="/app-do-motorista" variant="text" className="mt-6">
            Conheça o app completo
          </ArrowLink>
        </div>

        <Reveal delay={150} className="relative flex justify-center py-5">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -ml-[260px] -mt-[260px] size-[520px] rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, var(--acc-soft), transparent)",
            }}
          />
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -ml-[210px] -mt-[210px] size-[420px] rounded-full border border-site-line"
          />
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -ml-[300px] -mt-[300px] size-[600px] rounded-full border border-site-line opacity-60"
          />
          <div
            id="app-tela"
            role="tabpanel"
            aria-labelledby={`app-tab-${current}`}
            className="relative w-[min(290px,72vw)]"
          >
            <PhoneMockup screen={tabs[current]?.screen ?? tabs[0].screen} />
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export { ProductApp };
