"use client";

import { useEffect, useRef, useState } from "react";

import { Check } from "lucide-react";

import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { reducedMotion } from "@/components/site/institutional/motion";
import { cn } from "@/lib/utils";

/**
 * Sobre · Linha do tempo. From 760px the section pins while the cards slide
 * sideways with the scroll, a rail fills and a marker drives along it.
 *
 * That pinned mode is switched on after hydration only. The server HTML,
 * no-JS and reduced motion get the same cards in a row that scrolls sideways
 * on its own (with snap), every card at full strength: nothing depends on
 * the script to be read, and the page itself never scrolls sideways. Below
 * 760px it is a vertical list.
 */

type Module = "f" | "d";

const TIMELINE: {
  year: string;
  stage: string;
  title: string;
  desc: string;
  ach: string;
  m: Module;
}[] = [
  {
    year: "2024",
    stage: "IDEAÇÃO",
    title: "Ideação e Planejamento",
    desc: "Início do desenvolvimento da plataforma Trajetto com foco em resolver desafios reais da gestão de frotas.",
    ach: "Arquitetura moderna e escalável",
    m: "f",
  },
  {
    year: "2025",
    stage: "BETA",
    title: "Lançamento Beta",
    desc: "Versão beta disponibilizada para empresas parceiras com gestão completa de veículos e motoristas.",
    ach: "Primeiros clientes conquistados",
    m: "f",
  },
  {
    year: "2025",
    stage: "OFICIAL",
    title: "Versão Oficial",
    desc: "Lançamento da plataforma completa com recursos avançados de controle, relatórios e automações.",
    ach: "Plataforma estável e em produção",
    m: "f",
  },
  {
    year: "2026",
    stage: "ENTREGAS",
    title: "Gestão de Entregas",
    desc: "Chega o segundo módulo: embarcadores, importação de NF-e, rotas, torre de controle, comprovante digital e o app do motorista com entregas e chat.",
    ach: "Frotas e entregas na mesma plataforma",
    m: "d",
  },
];

const TEXT = { f: "text-site-violet", d: "text-site-pink" } as const;
const SOFT = { f: "bg-site-violet-soft", d: "bg-site-pink-soft" } as const;
const DOT = {
  f: "rgb(var(--site-violet))",
  d: "rgb(var(--site-pink))",
} as const;
// Pinned mode: a card not reached yet is drawn in greys and takes its module
// colours when reached. (The design fades it to 40% opacity, below AA.)
const ON_TEXT = {
  f: "group-data-[on]/card:text-site-violet",
  d: "group-data-[on]/card:text-site-pink",
} as const;
const ON_SOFT = {
  f: "group-data-[on]/card:bg-site-violet-soft",
  d: "group-data-[on]/card:bg-site-pink-soft",
} as const;
const PENDING_TEXT = "text-site-muted transition-colors duration-500";

const LAST = TIMELINE.length - 1;

const AboutTimeline = (): JSX.Element => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const vehicleRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [height, setHeight] = useState<number | null>(null);

  // Pinned mode: wide screens with motion allowed.
  useEffect(() => {
    if (reducedMotion()) return;
    const wide = window.matchMedia("(min-width: 760px)");
    const update = () => setPinned(wide.matches);
    update();
    wide.addEventListener("change", update);

    return () => wide.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!pinned || !section || !track) {
      setHeight(null);
      return;
    }

    let shift = 0;
    let frame = 0;

    const paint = () => {
      frame = 0;
      const vh = window.innerHeight;
      const rect = section.getBoundingClientRect();
      const raw = Math.min(
        1,
        Math.max(0, -rect.top / Math.max(1, rect.height - vh)),
      );
      const progress = Math.min(1, raw / 0.9);

      track.style.transform = `translate3d(${(-progress * shift).toFixed(1)}px,0,0)`;
      if (fillRef.current)
        fillRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
      if (vehicleRef.current)
        vehicleRef.current.style.left = `${(progress * 100).toFixed(2)}%`;

      section
        .querySelectorAll<HTMLElement>("[data-step]")
        .forEach((element) => {
          const index = Number(element.dataset.step);
          element.toggleAttribute("data-on", progress >= index / LAST - 0.015);
        });
    };
    const measure = () => {
      shift = Math.max(0, track.scrollWidth - window.innerWidth);
      setHeight(Math.round(window.innerHeight * 1.35 + shift * 1.15));
      paint();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      track.style.transform = "";
    };
  }, [pinned]);

  return (
    <section id="timeline" aria-labelledby="tl-titulo" className="scroll-mt-0">
      {/* Wide: the pinned rail and cards. */}
      <div
        ref={sectionRef}
        data-pinned={pinned ? "" : undefined}
        className="group/tl relative hidden min-[760px]:block"
        style={pinned && height ? { height } : undefined}
      >
        <div
          className={cn(
            "flex flex-col justify-center gap-[clamp(28px,5vh,48px)]",
            pinned
              ? "sticky top-0 h-screen overflow-hidden"
              : "py-[clamp(80px,10vw,128px)]",
          )}
        >
          <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-end justify-between gap-x-10 gap-y-4 px-[clamp(20px,4vw,40px)]">
            <div>
              <Eyebrow className="mb-3.5">LINHA DO TEMPO</Eyebrow>
              <SectionHeading
                id="tl-titulo"
                className="text-[clamp(34px,4.2vw,56px)] leading-[1.02]"
                balance={false}
              >
                Do papel à plataforma.
              </SectionHeading>
            </div>
            <p className="m-0 max-w-[380px] text-base leading-[1.6] text-site-muted">
              Frotas e entregas no mesmo lugar, um passo de cada vez.
            </p>
          </div>

          <div
            aria-hidden="true"
            className="mx-auto w-full max-w-[1280px] px-[clamp(20px,4vw,40px)]"
          >
            <div className="relative h-11">
              <div className="absolute inset-x-0 top-[21px] h-0.5 rounded-sm bg-site-line2" />
              <div
                ref={fillRef}
                className="absolute inset-x-0 top-[21px] h-0.5 origin-left rounded-sm bg-[linear-gradient(90deg,rgb(var(--site-violet))_0%,rgb(var(--site-violet))_62%,rgb(var(--site-pink))_100%)]"
                style={{ transform: pinned ? "scaleX(0)" : undefined }}
              />
              {TIMELINE.map((step, index) => (
                <div
                  key={`${step.stage}-dot`}
                  className="absolute top-0 flex w-0 flex-col items-center"
                  style={{ left: `${(index / LAST) * 100}%` }}
                >
                  <span
                    data-step={index}
                    data-on={pinned ? undefined : ""}
                    className="mt-[15px] size-3.5 shrink-0 rounded-full border-2 border-site-line2 bg-site-bg transition-[background-color,border-color,transform] duration-300 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] data-[on]:border-[color:var(--dot)] data-[on]:bg-[color:var(--dot)] group-data-[pinned]/tl:data-[on]:scale-[1.15]"
                    style={{ ["--dot" as string]: DOT[step.m] }}
                  />
                </div>
              ))}
              {pinned ? (
                <div
                  ref={vehicleRef}
                  className="absolute left-0 top-3 -ml-2.5 flex size-5 items-center justify-center rounded-[7px] bg-site-ink shadow-[0_0_0_4px_rgb(var(--site-bg)),0_6px_16px_-4px_rgba(14,14,30,.4)]"
                >
                  <span className="size-1.5 rounded-full bg-site-bg" />
                </div>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              pinned
                ? ""
                : "snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-4 [scrollbar-width:thin]",
            )}
          >
            <div
              ref={trackRef}
              className="flex w-max gap-6 pl-[max(clamp(20px,4vw,40px),calc((100vw-1280px)/2+40px))] pr-[clamp(20px,4vw,40px)] will-change-transform"
            >
              {TIMELINE.map((step, index) => (
                <article
                  key={step.stage}
                  data-step={index}
                  data-on={pinned ? undefined : ""}
                  className={cn(
                    "w-[min(440px,78vw)] shrink-0 snap-start rounded-[26px] border border-site-line bg-site-surface p-[30px] shadow-[0_30px_60px_-40px_rgba(14,14,30,.35)]",
                    "group/card transition-transform [transition-duration:600ms] ease-site",
                    pinned && "translate-y-3 data-[on]:translate-y-0",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "font-site-display text-[64px] font-medium leading-none tracking-[-.05em]",
                        pinned ? [PENDING_TEXT, ON_TEXT[step.m]] : TEXT[step.m],
                      )}
                    >
                      {step.year}
                    </span>
                    <span
                      className={cn(
                        "whitespace-nowrap rounded-full px-2.5 py-[5px] font-site-mono text-[11px] tracking-[.1em]",
                        pinned
                          ? [
                              PENDING_TEXT,
                              "bg-site-soft2 transition-[background-color,color]",
                              ON_SOFT[step.m],
                              ON_TEXT[step.m],
                            ]
                          : [SOFT[step.m], TEXT[step.m]],
                      )}
                    >
                      {step.stage}
                    </span>
                  </div>
                  <h3
                    className={cn(
                      "m-0 mt-[26px] text-[21px] font-semibold tracking-[-.01em]",
                      pinned && [
                        PENDING_TEXT,
                        "group-data-[on]/card:text-site-ink",
                      ],
                    )}
                  >
                    {step.title}
                  </h3>
                  <p className="m-0 mt-2.5 text-[15.5px] leading-[1.6] text-site-muted [text-wrap:pretty]">
                    {step.desc}
                  </p>
                  <p
                    className={cn(
                      "m-0 mt-[22px] flex items-center gap-2 border-t border-site-line pt-[18px] text-sm font-medium",
                      pinned && [
                        PENDING_TEXT,
                        "group-data-[on]/card:text-site-ink",
                      ],
                    )}
                  >
                    <Check
                      aria-hidden
                      strokeWidth={2.4}
                      className={cn("size-4 shrink-0", TEXT[step.m])}
                    />
                    {step.ach}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Narrow: a vertical list. */}
      <div className="px-[clamp(20px,4vw,40px)] py-[clamp(64px,10vw,96px)] min-[760px]:hidden">
        <Eyebrow className="mb-3.5">LINHA DO TEMPO</Eyebrow>
        <h2 className="m-0 mb-9 font-site-display text-4xl font-medium leading-[1.02] tracking-[-.035em]">
          Do papel à plataforma.
        </h2>
        <ol className="relative m-0 flex list-none flex-col gap-5 p-0 pl-[30px]">
          <span
            aria-hidden="true"
            className="absolute bottom-2 left-1.5 top-2 w-0.5 rounded-sm bg-[linear-gradient(rgb(var(--site-violet)),rgb(var(--site-pink)))]"
          />
          {TIMELINE.map((step) => (
            <Reveal
              as="li"
              key={step.stage}
              className="relative rounded-[20px] border border-site-line bg-site-surface p-[22px]"
            >
              <span
                aria-hidden="true"
                className="absolute -left-[30px] top-7 size-3.5 rounded-full shadow-[0_0_0_4px_rgb(var(--site-bg))]"
                style={{ background: DOT[step.m] }}
              />
              <span
                className={cn(
                  "font-site-display text-[40px] font-medium leading-none tracking-[-.04em]",
                  TEXT[step.m],
                )}
              >
                {step.year}
              </span>
              <h3 className="m-0 mt-3.5 text-[19px] font-semibold">
                {step.title}
              </h3>
              <p className="m-0 mt-2 text-[15px] leading-[1.6] text-site-muted">
                {step.desc}
              </p>
              <p className="m-0 mt-3.5 text-[13.5px] font-medium">{step.ach}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
};

export { AboutTimeline };
