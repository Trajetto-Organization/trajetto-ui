"use client";

import { useEffect, useRef, useState } from "react";

import { Check } from "lucide-react";

import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

import { PRODUCTS, type ProductModule } from "./content";
import { prefersReducedMotion } from "./motion";

/**
 * "Como funciona": the steps of the module. From 960px the intro and a step
 * index stay sticky on the left while the cards scroll; the card that passed
 * 55% of the viewport is the current one (full opacity, accent icon) and the
 * index follows it. Below 960px every card is shown as current, so the
 * dimming lives in min-[960px] classes and the server HTML is right at any
 * width.
 */
const ProductFlow = ({ module }: { module: ProductModule }): JSX.Element => {
  const product = PRODUCTS[module];
  const steps = product.flow;
  const listRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const cards =
          listRef.current?.querySelectorAll<HTMLElement>("[data-step]");
        if (!cards) return;
        const line = window.innerHeight * 0.55;
        let active = 0;
        cards.forEach((card, index) => {
          if (card.getBoundingClientRect().top < line) active = index;
        });
        setCurrent(active);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const goTo = (index: number) => {
    const card =
      listRef.current?.querySelectorAll<HTMLElement>("[data-step]")[index];
    if (!card) return;
    window.scrollTo({
      top:
        card.getBoundingClientRect().top +
        window.scrollY -
        window.innerHeight * 0.3,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  return (
    <section
      id="como-funciona"
      aria-labelledby="fluxo-titulo"
      className="scroll-mt-[70px] px-[clamp(20px,4vw,40px)] py-[clamp(64px,9vw,120px)]"
    >
      <div className="mx-auto grid max-w-[1200px] items-start gap-[clamp(32px,6vw,88px)] min-[960px]:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col gap-5 min-[960px]:sticky min-[960px]:top-[110px]">
          <Reveal>
            <Eyebrow className="mb-4">COMO FUNCIONA</Eyebrow>
            <SectionHeading
              id="fluxo-titulo"
              className="text-[clamp(34px,4vw,54px)] leading-[1.02]"
            >
              {product.flowTitle}
            </SectionHeading>
            <p className="mb-0 mt-[18px] max-w-[440px] text-[17px] leading-[1.6] text-site-muted [text-wrap:pretty]">
              {product.flowDescription}
            </p>
          </Reveal>

          <ol
            aria-label="Etapas"
            className="m-0 mt-3 hidden list-none flex-col gap-0.5 p-0 min-[960px]:flex"
          >
            {steps.map((step, index) => {
              const on = index === current;
              const reached = index <= current;

              return (
                <li key={step.title}>
                  <button
                    type="button"
                    onClick={() => goTo(index)}
                    aria-current={on ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3.5 rounded-xl px-3 py-[11px] text-left outline-none transition-colors duration-300",
                      "focus-visible:ring-2 focus-visible:ring-site-ink/40",
                      on
                        ? "bg-site-surface"
                        : "bg-transparent hover:bg-site-surface/60",
                    )}
                  >
                    <span
                      className={cn(
                        "font-site-mono text-[11.5px] transition-colors duration-300",
                        reached ? "text-[var(--acc)]" : "text-site-muted",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-[14.5px] transition-colors duration-300",
                        on
                          ? "font-semibold text-site-ink"
                          : "font-medium text-site-muted",
                      )}
                    >
                      {step.title}
                    </span>
                    <span
                      aria-hidden
                      className="relative h-[3px] w-10 overflow-hidden rounded-full bg-site-line2"
                    >
                      <span
                        className="absolute inset-0 origin-left rounded-full bg-[var(--acc)] transition-transform duration-500 ease-site"
                        style={{
                          transform: reached ? "scaleX(1)" : "scaleX(0)",
                        }}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div ref={listRef} className="flex flex-col gap-5">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const on = index === current;

            return (
              <article
                key={step.title}
                data-step=""
                data-active={on ? "true" : "false"}
                className={cn(
                  "group rounded-[26px] border border-site-line bg-site-surface p-[clamp(24px,3vw,36px)]",
                  "transition-[opacity,border-color,transform,box-shadow] duration-500 [transition-timing-function:cubic-bezier(.22,1,.36,1)]",
                  "min-[960px]:data-[active=true]:border-site-line2 min-[960px]:data-[active=true]:shadow-[0_30px_60px_-40px_rgba(14,14,30,.35)]",
                  // The design fades inactive steps to 50% opacity, which takes their
                  // text below AA; they fade by colour instead (title and points
                  // turn muted, still >= 4.5:1), with the same scale and icon change.
                  "min-[960px]:data-[active=false]:scale-[.985]",
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <span
                    className={cn(
                      "flex size-[52px] items-center justify-center rounded-2xl bg-[var(--acc)] text-white transition-colors [transition-duration:400ms]",
                      "min-[960px]:group-data-[active=false]:bg-[var(--acc-soft)] min-[960px]:group-data-[active=false]:text-[var(--acc)]",
                    )}
                  >
                    <Icon aria-hidden className="size-6" />
                  </span>
                  {/* Decorative step number, drawn as generated content: it is a
                      watermark (hairline colour by design), not text to read. */}
                  <span
                    aria-hidden
                    data-n={String(index + 1).padStart(2, "0")}
                    className="font-site-display text-[44px] font-medium leading-none tracking-[-.04em] text-site-line2 before:content-[attr(data-n)]"
                  />
                </div>
                <h3 className="mb-0 mt-[26px] font-site-display text-[clamp(24px,2.4vw,30px)] font-medium tracking-[-.02em] transition-colors duration-500 min-[960px]:group-data-[active=false]:text-site-muted">
                  {step.title}
                </h3>
                <p className="mb-0 mt-2.5 max-w-[560px] text-base leading-[1.6] text-site-muted [text-wrap:pretty]">
                  {step.description}
                </p>
                <ul className="m-0 mt-[22px] grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-5 gap-y-0.5 p-0">
                  {step.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-2.5 border-t border-site-line py-[9px] text-[14.5px] leading-[1.45] transition-colors duration-500 min-[960px]:group-data-[active=false]:text-site-muted"
                    >
                      <Check
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-[var(--acc)]"
                        strokeWidth={2.4}
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export { ProductFlow };
