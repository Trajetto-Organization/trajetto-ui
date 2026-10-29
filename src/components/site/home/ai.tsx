"use client";

import { useEffect, useRef, useState, type FocusEvent } from "react";

import { Check, Gauge, Sparkles } from "lucide-react";

import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

import styles from "./home.module.css";
import {
  tabListKeys,
  useInView,
  usePrefersReducedMotion,
} from "./use-home-motion";

/**
 * "IA que confere as fotos por você", the dark band. Three analyses as a
 * tab list; the panel shows the photo being read and the analysis steps
 * ticking off (one every 0.95s, a short rest, then the next analysis).
 * Focus or a pointer on the list holds it; a choice keeps it on that
 * analysis; reduced motion shows the finished analysis, still.
 *
 * The band is dark in both themes, so its colours are fixed.
 */

const TICK_MS = 950;
/** Steps 0..6: four checks, then two ticks of rest before moving on. */
const LAST_TICK = 6;

type Analysis = {
  key: "odo" | "check" | "proof";
  group: "d" | "f";
  title: string;
  subtitle: string;
  steps: string[];
  note: string;
};

const ANALYSES: Analysis[] = [
  {
    key: "odo",
    group: "f",
    title: "Leitura de odômetro",
    subtitle: "Quilometragem extraída da foto",
    steps: [
      "Foto do odômetro recebida",
      "Quilometragem lida pela IA",
      "Comparada com a digitada",
      "Divergência sinalizada",
    ],
    note: "A leitura fica ao lado do valor informado pelo motorista",
  },
  {
    key: "check",
    group: "f",
    title: "Checklist inteligente",
    subtitle: "Conferência das fotos de cada item",
    steps: [
      "Fotos do checklist recebidas",
      "Itens conferidos pela IA",
      "Condições avaliadas",
      "Resultado junto ao registro",
    ],
    note: "Análise feita no servidor, sem travar o app",
  },
  {
    key: "proof",
    group: "d",
    title: "Comprovante de entrega",
    subtitle: "Conferência da foto do canhoto",
    steps: [
      "O canhoto está legível?",
      "O número da nota confere?",
      "A data está presente?",
      "Há assinatura?",
    ],
    note: "A IA sugere; a decisão é da sua equipe na auditoria",
  },
];

const CHECK_ITEMS = ["Pneus", "Faróis", "Freios", "Nível óleo"];

/** Module colour on the dark band (the dark theme's accents). */
const ACCENT = { d: "#f0558e", f: "#a78bfa" } as const;

const HomeAI = (): JSX.Element => {
  const sectionRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // One state for both, so a tick moves them together (no setState inside an updater).
  const [{ active, step }, setDemo] = useState({ active: 0, step: 0 });
  const [chosen, setChosen] = useState(false);
  const [held, setHeld] = useState(false);
  const inView = useInView(sectionRef);
  const reduced = usePrefersReducedMotion();

  const running = inView && !held && !reduced;

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      setDemo((demo) => {
        if (demo.step < LAST_TICK)
          return { active: demo.active, step: demo.step + 1 };
        return {
          active: chosen ? demo.active : (demo.active + 1) % ANALYSES.length,
          step: 0,
        };
      });
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [running, chosen]);

  const select = (index: number, focus: boolean) => {
    setDemo({ active: index, step: 0 });
    setChosen(true);
    if (focus) tabRefs.current[index]?.focus();
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setHeld(false);
  };

  const analysis = ANALYSES[active];
  const color = ACCENT[analysis.group];
  // A still picture under reduced motion is the finished one.
  const done = reduced ? 4 : Math.min(4, step);

  return (
    <section
      ref={sectionRef}
      id="ia"
      aria-labelledby="ia-titulo"
      className="relative overflow-hidden bg-[#0b0b10] px-[clamp(20px,4vw,40px)] py-[clamp(80px,11vw,140px)] text-[#f3f3f6]"
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-[background] duration-700",
          analysis.group === "d"
            ? "bg-[radial-gradient(40%_50%_at_80%_30%,rgba(240,85,142,.16),transparent_70%)]"
            : "bg-[radial-gradient(40%_50%_at_80%_30%,rgba(155,125,255,.18),transparent_70%)]",
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[length:56px_56px] opacity-50 [-webkit-mask-image:radial-gradient(70%_70%_at_50%_40%,#000,transparent)] [mask-image:radial-gradient(70%_70%_at_50%_40%,#000,transparent)]"
      />

      <div className="relative mx-auto max-w-[1200px]">
        <Reveal className="max-w-[720px]">
          <Eyebrow tone="dark-band" className="mb-4">
            INTELIGÊNCIA ARTIFICIAL
          </Eyebrow>
          <SectionHeading
            id="ia-titulo"
            className="text-[clamp(34px,4.8vw,64px)] leading-[1.02]"
          >
            IA que confere as fotos por você.
          </SectionHeading>
          <p className="m-0 mt-5 max-w-[560px] text-[17px] leading-[1.6] text-[#a8aab5] [text-wrap:pretty]">
            Odômetro, checklist e canhoto de entrega analisados no servidor, com
            um limite mensal de análises por empresa visível no painel.
          </p>
        </Reveal>

        <div className="mt-[clamp(40px,6vw,64px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] items-stretch gap-5">
          <Reveal className="flex flex-col gap-2">
            <div
              role="tablist"
              aria-label="Análises da IA"
              aria-orientation="vertical"
              onMouseEnter={() => setHeld(true)}
              onMouseLeave={() => setHeld(false)}
              onFocus={() => setHeld(true)}
              onBlur={onBlur}
              onKeyDown={tabListKeys(ANALYSES.length, active, select)}
              className="flex flex-col gap-2"
            >
              {ANALYSES.map((item, index) => {
                const selected = index === active;

                return (
                  <button
                    key={item.key}
                    ref={(element) => {
                      tabRefs.current[index] = element;
                    }}
                    type="button"
                    role="tab"
                    id={`ia-tab-${item.key}`}
                    aria-selected={selected}
                    aria-controls="ia-demo"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => select(index, false)}
                    className={cn(
                      "flex items-center gap-4 rounded-[18px] border px-5 py-[18px] text-left text-[#f3f3f6] outline-none transition-[background-color,border-color] [transition-duration:350ms]",
                      "focus-visible:ring-2 focus-visible:ring-white/50",
                      selected
                        ? "border-white/[.16] bg-white/[.06]"
                        : "border-white/[.06] bg-transparent hover:bg-white/[.03]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-2.5 shrink-0",
                        item.group === "d" ? "rounded-full" : "rounded-[3px]",
                      )}
                      style={{ background: ACCENT[item.group] }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[13.5px] text-[#9d9fab]">
                        {item.subtitle}
                      </span>
                    </span>
                    <span className="font-site-mono text-[11px] font-medium text-[#9d9fab]">
                      {item.group === "d" ? "ENTREGAS" : "FROTAS"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="m-0 mx-1 mt-3 flex items-center gap-2 text-[13px] text-[#9d9fab]">
              <Sparkles aria-hidden className="size-3.5 shrink-0" />
              {analysis.note}
            </p>
          </Reveal>

          <Reveal
            delay={120}
            id="ia-demo"
            role="tabpanel"
            aria-labelledby={`ia-tab-${analysis.key}`}
            tabIndex={0}
            className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-5 rounded-[26px] border border-white/[.08] bg-[#121218] p-5 outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-[18px] border border-white/[.06] bg-[linear-gradient(#1b1b23,#101016)]">
              {analysis.key === "odo" ? (
                <div
                  key="odo"
                  role="img"
                  aria-label="Foto do odômetro: 087.432 km"
                  className="animate-[tpUp_.5s_cubic-bezier(.22,1,.36,1)_both] text-center"
                >
                  <Gauge
                    aria-hidden
                    className="mx-auto size-[34px] text-[#a78bfa]"
                  />
                  <div className="mt-2.5 animate-[tpPulse_2.5s_ease-in-out_infinite] font-site-mono text-[34px] font-medium tracking-[.08em]">
                    087.432
                  </div>
                  <p className="m-0 mt-1 text-xs text-[#9d9fab]">km</p>
                </div>
              ) : null}

              {analysis.key === "check" ? (
                <ul
                  key="check"
                  aria-label="Itens do checklist"
                  className="m-0 flex w-full animate-[tpUp_.5s_cubic-bezier(.22,1,.36,1)_both] list-none flex-col gap-3 px-7"
                >
                  {CHECK_ITEMS.map((label, index) => (
                    <li key={label} className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-[18px] items-center justify-center rounded-[5px] transition-colors duration-300",
                          index < done ? "bg-[#10b981]" : "bg-white/[.12]",
                        )}
                      >
                        <Check
                          className="size-[11px] text-white"
                          strokeWidth={3}
                        />
                      </span>
                      <span className="text-sm text-[#d4d4dc]">{label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {analysis.key === "proof" ? (
                <div
                  key="proof"
                  role="img"
                  aria-label="Foto do canhoto da NF-e 000.482.113, recebido em 28/09 e assinado"
                  className="animate-[tpUp_.5s_cubic-bezier(.22,1,.36,1)_both]"
                >
                  <div className="w-[150px] -rotate-3 rounded bg-white p-3 text-[#1e293b] shadow-[0_20px_40px_-10px_rgba(0,0,0,.6)]">
                    <p className="m-0 text-[11px] font-bold">
                      NF-e 000.482.113
                    </p>
                    <div className="mt-2 flex flex-col gap-[5px]">
                      <div className="h-1 rounded-sm bg-[#e2e8f0]" />
                      <div className="h-1 w-4/5 rounded-sm bg-[#e2e8f0]" />
                      <div className="h-1 w-3/5 rounded-sm bg-[#e2e8f0]" />
                    </div>
                    <p className="m-0 mt-2 text-[9.5px] text-[#64748b]">
                      28/09 · Recebido por
                    </p>
                    <svg
                      aria-hidden
                      viewBox="0 0 90 22"
                      className="mt-0.5 block h-[22px] w-full"
                    >
                      <path
                        d="M4 16 C 12 2, 18 4, 18 14 S 28 20, 34 10 S 44 4, 50 14 S 62 18, 70 8 L 86 7"
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              ) : null}

              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 top-[18px] h-0.5",
                  styles.scan,
                )}
                style={{
                  background: `linear-gradient(90deg,transparent,${color},transparent)`,
                  boxShadow: `0 0 18px ${color}`,
                }}
              />
            </div>

            <ol className="m-0 flex list-none flex-col justify-center gap-1.5 p-0">
              {analysis.steps.map((label, index) => {
                const ok = index < done;
                const current = index === done;

                return (
                  <li
                    key={label}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors [transition-duration:350ms]",
                      current ? "bg-white/[.05]" : "bg-transparent",
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex size-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all [transition-duration:350ms]"
                      style={{
                        borderColor: ok
                          ? color
                          : current
                            ? "rgba(255,255,255,.5)"
                            : "rgba(255,255,255,.18)",
                        background: ok ? color : "transparent",
                      }}
                    >
                      <Check
                        className={cn(
                          "size-[13px] text-white transition-opacity duration-300",
                          ok ? "opacity-100" : "opacity-0",
                        )}
                        strokeWidth={3}
                      />
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-sm transition-colors [transition-duration:350ms]",
                        ok || current ? "text-[#f3f3f6]" : "text-[#8b8d98]",
                      )}
                    >
                      {label}
                      {ok ? (
                        <span className="sr-only"> (concluído)</span>
                      ) : null}
                    </span>
                    <span
                      aria-hidden
                      className="font-site-mono text-[10.5px] font-medium text-[#8b8d98]"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export { HomeAI };
