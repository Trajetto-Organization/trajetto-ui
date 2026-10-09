"use client";

import { useEffect, useRef } from "react";

import { ArrowLink } from "@/components/site/arrow-link";
import { Eyebrow } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { reducedMotion } from "@/components/site/institutional/motion";

/**
 * Sobre · Quem somos: the manifesto lights up word by word as it scrolls
 * through the viewport. The server HTML (and no-JS, and reduced motion) has
 * every word fully lit; only after hydration do the words dim, and the
 * section is below the hero, so that switch is never on screen.
 *
 * The design dims to 16% opacity, which leaves unread words at ~1.4:1. They
 * dim by colour instead, to a grey that keeps 3:1 (AA for large text), and
 * light up to ink (or the module colour) with the same scroll progress.
 */

const MANIFESTO =
  "O Trajetto nasceu da necessidade de simplificar processos complexos de gestão de frota. Fundado por quatro sócios que somam experiência em produto, engenharia, infraestrutura e vendas B2B, cresceu com a operação dos clientes e ganhou o módulo de entregas.";

/** Words drawn in the module colour (their lit colour). */
const HIGHLIGHT: Record<string, string> = {
  "frota.": "[--lit:rgb(var(--site-violet))]",
  "entregas.": "[--lit:rgb(var(--site-pink))]",
};

/** Each word mixes its lit colour with the dim grey by --p (0..1, unset = lit). */
const WORD_CLASS =
  "mr-[.24em] inline-block [--dim:#8a8c96] dark:[--dim:#606169] [color:color-mix(in_srgb,var(--lit,rgb(var(--site-ink)))_calc(var(--p,1)*100%),var(--dim))] transition-colors [transition-duration:250ms] ease-linear";

const AboutManifesto = (): JSX.Element => {
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const text = textRef.current;
    if (!text || reducedMotion()) return;

    const words = Array.from(text.querySelectorAll<HTMLElement>("[data-w]"));
    let frame = 0;

    const paint = () => {
      frame = 0;
      const vh = window.innerHeight;
      const rect = text.getBoundingClientRect();
      const progress = Math.min(
        1,
        Math.max(0, (vh * 0.82 - rect.top) / (vh * 0.75)),
      );
      const lit = progress * (words.length + 4);

      words.forEach((word, index) => {
        const p = Math.min(1, Math.max(0, lit - index)).toFixed(2);
        if (word.style.getPropertyValue("--p") !== p)
          word.style.setProperty("--p", p);
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    paint();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      words.forEach((word) => word.style.removeProperty("--p"));
    };
  }, []);

  return (
    <section
      id="quem-somos"
      aria-labelledby="quem-titulo"
      className="scroll-mt-20 px-[clamp(20px,4vw,40px)] py-[clamp(80px,12vw,160px)]"
    >
      <div className="mx-auto max-w-[1200px]">
        <Eyebrow id="quem-titulo" className="mb-7">
          QUEM SOMOS
        </Eyebrow>
        <p
          ref={textRef}
          className="m-0 max-w-[1100px] font-site-display text-[clamp(30px,4.2vw,58px)] font-medium leading-[1.12] tracking-[-.03em] [text-wrap:pretty]"
        >
          {MANIFESTO.split(" ").map((word, index) => (
            <span
              key={`${word}-${index}`}
              data-w=""
              className={`${WORD_CLASS} ${HIGHLIGHT[word] ?? ""}`}
            >
              {word}
            </span>
          ))}
        </p>
        <Reveal className="mt-[clamp(40px,6vw,72px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-x-16 gap-y-6 border-t border-site-line pt-8">
          <p className="m-0 text-[17px] leading-[1.65] text-site-muted [text-wrap:pretty]">
            Atendemos transportadoras e empresas com frota própria. Cada empresa
            contrata os módulos de que precisa, Frotas, Entregas ou os dois, e
            organiza filiais, perfis de acesso e equipes do seu jeito.
          </p>
          <div className="flex items-start justify-start">
            <ArrowLink href="#timeline" size="md">
              Conheça nossa história
            </ArrowLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export { AboutManifesto };
