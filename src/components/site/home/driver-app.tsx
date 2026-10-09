"use client";

import { useEffect, useRef, useState, type FocusEvent } from "react";

import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { PhoneMockup, type PhoneScreen } from "@/components/site/phone-mockup";
import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

import {
  tabListKeys,
  useInView,
  usePrefersReducedMotion,
} from "./use-home-motion";

/**
 * "App do motorista": the app's five screens as a tab list beside the
 * phone. It advances by itself every 4.8s while on screen, with a progress
 * line under the current step; hovering or focusing the list pauses it, a
 * click (or a key) hands control to the visitor for good, and reduced
 * motion never starts it.
 */

const STEP_MS = 4800;

type Group = "d" | "f";

const STEPS: { id: PhoneScreen; group: Group; title: string; desc: string }[] =
  [
    {
      id: "deliveries",
      group: "d",
      title: "Entregas do dia",
      desc: "As paradas na ordem definida pelo despachante, com o status de cada uma.",
    },
    {
      id: "proof",
      group: "d",
      title: "Comprovante",
      desc: "Foto do canhoto, assinatura na tela, quem recebeu e a localização do registro.",
    },
    {
      id: "offline",
      group: "d",
      title: "Fila sem sinal",
      desc: "Sem conexão, o registro fica no aparelho e é enviado quando o sinal volta, sem duplicar.",
    },
    {
      id: "fuel",
      group: "f",
      title: "Abastecimento",
      desc: "Foto do odômetro, litros e preço por litro; a posição é capturada no envio.",
    },
    {
      id: "checklist",
      group: "f",
      title: "Checklist",
      desc: "Inspeção item a item, com foto, direto do celular.",
    },
  ];

const GROUPS: { group: Group; label: string }[] = [
  { group: "d", label: "Entregas" },
  { group: "f", label: "Frotas" },
];

const HomeDriverApp = (): JSX.Element => {
  const sectionRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [chosen, setChosen] = useState(false);
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const inView = useInView(sectionRef);
  const reduced = usePrefersReducedMotion();

  const playing = inView && !chosen && !hover && !focused && !reduced;

  useEffect(() => {
    if (!playing) return;

    const timer = window.setTimeout(
      () => setActive((index) => (index + 1) % STEPS.length),
      STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [playing, active]);

  const select = (index: number, focus: boolean) => {
    setActive(index);
    setChosen(true);
    if (focus) tabRefs.current[index]?.focus();
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setFocused(false);
  };

  const current = STEPS[active];

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
            <SectionHeading id="app-titulo">
              O registro feito onde a operação acontece.
            </SectionHeading>
            <p className="m-0 mt-5 max-w-[500px] text-[17px] leading-[1.6] text-site-muted [text-wrap:pretty]">
              Um aplicativo Android para as duas operações. A rota do dia, o
              comprovante, o abastecimento e o checklist, mesmo sem sinal.
            </p>
          </Reveal>

          <Reveal
            delay={100}
            role="tablist"
            aria-label="Telas do app do motorista"
            aria-orientation="vertical"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onFocus={() => setFocused(true)}
            onBlur={onBlur}
            onKeyDown={tabListKeys(STEPS.length, active, select)}
            className="mt-9 flex flex-col gap-[22px]"
          >
            {GROUPS.map(({ group, label }) => (
              <div key={group} role="presentation">
                <p
                  aria-hidden
                  className="m-0 mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-site-muted"
                >
                  <span
                    className={cn(
                      "size-[7px]",
                      group === "d"
                        ? "rounded-full bg-site-pink"
                        : "rounded-[2px] bg-site-violet",
                    )}
                  />
                  {label}
                </p>
                <div role="presentation" className="flex flex-col gap-1">
                  {STEPS.map((step, index) => {
                    if (step.group !== group) return null;
                    const selected = index === active;

                    return (
                      <button
                        key={step.id}
                        ref={(element) => {
                          tabRefs.current[index] = element;
                        }}
                        type="button"
                        role="tab"
                        id={`app-tab-${step.id}`}
                        aria-selected={selected}
                        aria-controls="app-tela"
                        tabIndex={selected ? 0 : -1}
                        onClick={() => select(index, false)}
                        className={cn(
                          "relative flex gap-3.5 overflow-hidden rounded-[14px] border px-4 py-3.5 text-left outline-none transition-[background-color,border-color] duration-300",
                          "focus-visible:ring-2 focus-visible:ring-site-ink/40",
                          selected
                            ? "border-site-line2 bg-site-bg"
                            : "border-transparent hover:bg-site-bg/60",
                        )}
                      >
                        <span className="pt-0.5 font-site-mono text-[11.5px] font-medium text-site-muted">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold">
                            <span className="sr-only">{label}: </span>
                            {step.title}
                          </span>
                          <span
                            className={cn(
                              "grid transition-[grid-template-rows] [transition-duration:450ms] ease-site motion-reduce:transition-none",
                              selected ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                            )}
                          >
                            <span className="block min-h-0 overflow-hidden text-[13.5px] leading-[1.5] text-site-muted">
                              <span className="block pt-1">{step.desc}</span>
                            </span>
                          </span>
                        </span>
                        {selected && playing ? (
                          <span
                            aria-hidden
                            className={cn(
                              "absolute inset-x-0 bottom-0 h-0.5 origin-left animate-[tpProgress_4800ms_linear_both]",
                              group === "d" ? "bg-site-pink" : "bg-site-violet",
                            )}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </Reveal>
        </div>

        <Reveal delay={150} className="relative flex justify-center py-5">
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-1/2 top-1/2 -ml-[260px] -mt-[260px] size-[520px] rounded-full transition-[background] duration-700",
              current.group === "d"
                ? "bg-[radial-gradient(closest-side,var(--site-pink-soft),transparent)]"
                : "bg-[radial-gradient(closest-side,var(--site-violet-soft),transparent)]",
            )}
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
            aria-labelledby={`app-tab-${current.id}`}
            tabIndex={0}
            className="relative w-[min(290px,72vw)] rounded-[2.4rem] outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40 focus-visible:ring-offset-4 focus-visible:ring-offset-site-surface"
          >
            <PhoneMockup screen={current.id} />
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export { HomeDriverApp };
