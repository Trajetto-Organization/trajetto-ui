"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Check,
  FileCheck2,
  Fuel,
  LayoutDashboard,
  RefreshCw,
  Smartphone,
  TriangleAlert,
  WifiOff,
  type LucideIcon,
} from "lucide-react";

import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

import {
  OFFLINE_QUEUE,
  type Module,
  type QueueIcon,
  type QueueItem,
} from "./content";

/*
 * The dark band keeps its own palette in both themes (design: #0b0b10), so
 * the module colors are the design's fixed dark-band ones.
 */
const ICON: Record<QueueIcon, LucideIcon> = {
  proof: FileCheck2,
  fuel: Fuel,
  incident: TriangleAlert,
};

const DARK_TONE: Record<Module, string> = {
  d: "bg-[rgba(240,85,142,.16)] text-[#f0558e]",
  f: "bg-[rgba(155,125,255,.16)] text-[#a78bfa]",
  x: "bg-white/[.08] text-[#e5e7eb]",
};

function prefersReducedMotion(): boolean {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

const QueueRow = ({
  item,
  state,
  sent,
}: {
  item: QueueItem;
  state?: string;
  sent?: boolean;
}) => {
  const Icon = ICON[item.icon];

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-[14px] border px-3.5 py-3",
        sent
          ? "animate-[tpInScale_.5s_cubic-bezier(.22,1,.36,1)_both] border-[rgba(16,185,129,.22)] bg-[rgba(16,185,129,.07)]"
          : "animate-[tpInScale_.45s_cubic-bezier(.22,1,.36,1)_both] border-white/[.08] bg-white/[.04]",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-[10px]",
          DARK_TONE[item.module],
        )}
      >
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm font-semibold">{item.title}</p>
        <p className="m-0 truncate text-[12.5px] text-[#9d9fab]">{item.meta}</p>
      </div>
      {sent ? (
        <span className="flex size-[22px] shrink-0 animate-[tpPop_.45s_cubic-bezier(.34,1.56,.64,1)_.15s_both] items-center justify-center rounded-full bg-[#10b981] text-white">
          <Check aria-hidden strokeWidth={3.2} className="size-3" />
          <span className="sr-only">Enviado</span>
        </span>
      ) : (
        <span className="whitespace-nowrap font-site-mono text-[10.5px] tracking-[.08em] text-[#fbbf24]">
          {state}
        </span>
      )}
    </li>
  );
};

const Column = ({
  icon,
  title,
  count,
  children,
  empty,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  children: ReactNode;
  empty: ReactNode;
}) => (
  <div className="flex min-h-[300px] flex-col gap-3 rounded-3xl border border-white/[.08] bg-[#121218] p-[22px]">
    <div className="flex items-center justify-between gap-2.5">
      <h3 className="m-0 flex items-center gap-2.5 text-sm font-semibold">
        {icon}
        {title}
      </h3>
      <span
        className="font-site-mono text-xs text-[#9d9fab]"
        aria-label={`${count} itens`}
      >
        {String(count).padStart(2, "0")}
      </span>
    </div>
    {count > 0 ? (
      <ul className="m-0 flex list-none flex-col gap-3 p-0">{children}</ul>
    ) : (
      empty
    )}
  </div>
);

/**
 * "Sem sinal": a dark band with a working demo of the offline queue. The
 * records wait on the phone; when the signal comes back (the switch, or by
 * itself 1.6s after the band reaches the middle of the screen, once) they
 * move one by one to the company dashboard. Reduced motion: they move at once.
 */
const AppOffline = (): JSX.Element => {
  const sectionRef = useRef<HTMLElement>(null);
  const [signal, setSignal] = useState(false);
  const [sent, setSent] = useState(0);
  const [reduced, setReduced] = useState(false);
  const signalRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setTimeout>>();

  const changeSignal = useCallback((on: boolean) => {
    clearTimeout(tickRef.current);
    signalRef.current = on;
    setSignal(on);
    if (!on) {
      setSent(0);
      return;
    }
    if (prefersReducedMotion()) {
      setSent(OFFLINE_QUEUE.length);
      return;
    }
    const tick = (count: number) => {
      if (!signalRef.current || count >= OFFLINE_QUEUE.length) return;
      setSent(count + 1);
      tickRef.current = setTimeout(() => tick(count + 1), 750);
    };
    tickRef.current = setTimeout(() => tick(0), 500);
  }, []);

  // The first time the band crosses the middle of the viewport, bring the
  // signal back by itself, so a visitor who only scrolls sees the sync.
  useEffect(() => {
    setReduced(prefersReducedMotion());
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;

    let auto: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        auto = setTimeout(() => {
          if (!signalRef.current) changeSignal(true);
        }, 1600);
      },
      // The band between 30% and 55% of the viewport height (the design's trigger).
      { rootMargin: "-30% 0px -45% 0px" },
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      clearTimeout(auto);
    };
  }, [changeSignal]);

  useEffect(() => () => clearTimeout(tickRef.current), []);

  const queued = OFFLINE_QUEUE.slice(sent);
  const delivered = OFFLINE_QUEUE.slice(0, sent);
  const lineColor = signal ? "#34d399" : "#6b6d78";

  return (
    <section
      ref={sectionRef}
      aria-labelledby="offline-titulo"
      className="relative overflow-hidden bg-[#0b0b10] px-[clamp(20px,4vw,40px)] py-[clamp(80px,11vw,140px)] text-[#f3f3f6]"
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-1000",
          "bg-[radial-gradient(40%_50%_at_85%_30%,rgba(245,158,11,.12),transparent_70%)]",
          signal ? "opacity-0" : "opacity-100",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-1000",
          "bg-[radial-gradient(40%_50%_at_85%_30%,rgba(16,185,129,.14),transparent_70%)]",
          signal ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[length:56px_56px] opacity-50 [mask-image:radial-gradient(70%_70%_at_50%_40%,#000,transparent)]"
      />
      <div className="relative mx-auto max-w-[1200px]">
        <Reveal className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <div className="max-w-[660px]">
            <Eyebrow tone="dark-band" className="mb-4">
              SEM SINAL
            </Eyebrow>
            <SectionHeading
              id="offline-titulo"
              className="text-[clamp(34px,4.6vw,62px)] leading-[1.02]"
            >
              Sem sinal, o trabalho continua.
            </SectionHeading>
            <p className="m-0 mt-5 max-w-[540px] text-[17px] leading-[1.6] text-[#a8aab5] [text-wrap:pretty]">
              Comprovantes, ocorrências, abastecimentos e fotos ficam salvos no
              aparelho e são enviados quando o sinal volta, sem criar registros
              duplicados. O app mantém os dados da rota guardados por até 7
              dias.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={signal}
            onClick={() => changeSignal(!signal)}
            className="inline-flex min-h-[48px] cursor-pointer items-center gap-3.5 whitespace-nowrap rounded-2xl border border-white/[.12] bg-white/[.05] py-2.5 pl-[18px] pr-3 text-[14.5px] font-medium text-[#f3f3f6] outline-none transition-colors hover:bg-white/[.08] focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <span className="flex items-center gap-2">
              {signal ? (
                <RefreshCw aria-hidden className="size-4" />
              ) : (
                <WifiOff aria-hidden className="size-4" />
              )}
              {signal ? "Sinal de volta" : "Sem sinal"}
            </span>
            <span
              aria-hidden
              className={cn(
                "relative h-7 w-[46px] rounded-full transition-colors duration-300",
                signal ? "bg-[#10b981]" : "bg-white/[.18]",
              )}
            >
              <span
                className={cn(
                  "absolute left-[3px] top-[3px] size-[22px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.3)] dark:bg-white transition-transform duration-300 ease-site",
                  signal && "translate-x-[18px]",
                )}
              />
            </span>
          </button>
        </Reveal>

        <Reveal
          delay={120}
          className="mt-[clamp(40px,6vw,64px)] grid grid-cols-1 items-stretch gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]"
        >
          <Column
            icon={<Smartphone aria-hidden className="size-4" />}
            title="No aparelho"
            count={queued.length}
            empty={
              <p className="my-auto animate-[tpIn_.45s_ease_both] text-center text-sm text-[#8b8d98]">
                Nada pendente no aparelho.
              </p>
            }
          >
            {queued.map((item) => (
              <QueueRow
                key={item.title}
                item={item}
                state={signal ? "ENVIANDO" : "PENDENTE"}
              />
            ))}
          </Column>

          <div
            aria-hidden
            className="hidden w-[120px] flex-col items-center justify-center gap-2.5 min-[900px]:flex"
          >
            <svg
              width="120"
              height="24"
              viewBox="0 0 120 24"
              className="overflow-visible"
            >
              <path
                d="M4 12 H112"
                stroke={lineColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 8"
                className={cn(
                  "transition-[stroke] [transition-duration:400ms]",
                  signal && !reduced && "animate-[tpDash_.8s_linear_infinite]",
                )}
              />
              <path
                d="M106 6 L114 12 L106 18"
                fill="none"
                stroke={lineColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-[stroke] [transition-duration:400ms]"
              />
            </svg>
            <span
              className="whitespace-nowrap font-site-mono text-[11px] tracking-[.1em] transition-colors [transition-duration:400ms]"
              // The line's grey is too dim for 11px text on the band (3.8:1).
              style={{ color: signal ? lineColor : "#8b8d98" }}
            >
              {signal ? "ENVIANDO" : "AGUARDANDO"}
            </span>
          </div>

          <Column
            icon={<LayoutDashboard aria-hidden className="size-4" />}
            title="No painel da empresa"
            count={delivered.length}
            empty={
              <p className="my-auto text-center text-sm text-[#8b8d98]">
                Aguardando conexão.
              </p>
            }
          >
            {delivered.map((item) => (
              <QueueRow key={item.title} item={item} sent />
            ))}
          </Column>
        </Reveal>

        {/* Announces the sync to screen readers as the items move. */}
        <p className="sr-only" aria-live="polite">
          {signal
            ? `${delivered.length} de ${OFFLINE_QUEUE.length} registros enviados ao painel.`
            : `${OFFLINE_QUEUE.length} registros aguardando conexão no aparelho.`}
        </p>
      </div>
    </section>
  );
};

export { AppOffline };
