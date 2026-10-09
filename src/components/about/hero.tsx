import Image from "next/image";
import { ArrowDown, Globe, Package } from "lucide-react";

import { ArrowLink } from "@/components/site/arrow-link";
import { SectionHeading, Lead } from "@/components/site/primitives";
import { ParallaxSection } from "@/components/site/institutional/motion";
import { cn } from "@/lib/utils";

import { PARTNERS } from "./team";

/**
 * Sobre · Hero: routes drawn across the background with comets running on
 * them, the title over a soft spotlight, and four floating cards (from
 * 1100px) that drift with the pointer and the scroll.
 */

type Module = "f" | "d";

const ROUTES: { d: string; dur: string; delay: string; m: Module }[] = [
  {
    d: "M-40 470 C 180 380, 260 520, 460 430 S 760 250, 980 330 S 1180 420, 1260 300",
    dur: "9s",
    delay: "0s",
    m: "d",
  },
  {
    d: "M-40 150 C 160 220, 320 90, 520 170 S 820 330, 1020 210 S 1180 120, 1260 160",
    dur: "11s",
    delay: "-4s",
    m: "f",
  },
  {
    d: "M120 640 C 220 470, 380 400, 560 330 S 820 120, 940 -40",
    dur: "8s",
    delay: "-2s",
    m: "f",
  },
  {
    d: "M760 660 C 820 520, 980 470, 1060 360 S 1150 160, 1250 90",
    dur: "10s",
    delay: "-6s",
    m: "d",
  },
];

const STOPS: [number, number, string, Module][] = [
  [460, 431, "0s", "d"],
  [980, 330, "-1.1s", "d"],
  [520, 170, "-2.2s", "f"],
  [1020, 211, "-.6s", "f"],
  [560, 330, "-1.7s", "f"],
  [1060, 360, "-2.6s", "d"],
];

const colour = (m: Module) =>
  m === "d" ? "rgb(var(--site-pink))" : "rgb(var(--site-violet))";

const CARD =
  "rounded-2xl border border-site-line bg-site-surface shadow-[0_26px_50px_-24px_rgba(14,14,30,.4)] dark:shadow-[0_26px_50px_-24px_rgba(0,0,0,.7)]";

const AboutHero = (): JSX.Element => (
  <ParallaxSection
    aria-labelledby="sobre-titulo"
    className="relative flex min-h-[min(920px,100vh)] items-center justify-center overflow-hidden px-[clamp(20px,4vw,40px)] pb-[clamp(80px,10vh,120px)] pt-[clamp(120px,16vh,160px)]"
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_40%_at_20%_30%,var(--site-glow-a),transparent_70%),radial-gradient(45%_40%_at_80%_75%,var(--site-glow-b),transparent_70%)]"
    />
    <div
      data-par="0.05"
      aria-hidden="true"
      className="pointer-events-none absolute -inset-10 will-change-transform"
    >
      <svg
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
        className="block size-full opacity-85"
      >
        {ROUTES.map((route) => (
          <g key={route.d}>
            <path
              d={route.d}
              fill="none"
              strokeWidth={1.5}
              strokeDasharray="2 7"
              strokeLinecap="round"
              style={{ stroke: "var(--site-line2)" }}
            />
            <path
              d={route.d}
              pathLength={1}
              fill="none"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray=".1 1"
              style={{
                stroke: colour(route.m),
                animation: `tpComet ${route.dur} linear ${route.delay} infinite`,
              }}
            />
          </g>
        ))}
        {STOPS.map(([cx, cy, delay, m]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={5}
            style={{
              fill: colour(m),
              animation: `tpBlink 3.2s ease-in-out ${delay} infinite`,
            }}
          />
        ))}
      </svg>
    </div>
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_48%,rgb(var(--site-bg))_25%,transparent_70%),linear-gradient(to_bottom,transparent_70%,rgb(var(--site-bg)))]"
    />

    <div className="relative mx-auto flex max-w-[980px] flex-col items-center gap-[26px] text-center">
      <div className="inline-flex animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_both] items-center gap-2.5 whitespace-nowrap rounded-full border border-site-line2 bg-site-surface py-1.5 pl-1.5 pr-3.5 text-[13px] font-medium text-site-muted">
        <span className="rounded-full bg-site-ink px-[9px] py-[3px] font-site-mono text-[11px] tracking-[.06em] text-site-bg">
          2024
        </span>
        Nossa jornada
      </div>
      <SectionHeading
        id="sobre-titulo"
        size="hero"
        className="animate-[tpUp_.9s_cubic-bezier(.22,1,.36,1)_.06s_both] leading-[.98]"
      >
        Tecnologia para quem move frotas e entregas pelo{" "}
        <span className="animate-tp-grad bg-[linear-gradient(90deg,#009739,#d4b800,#009739,#d4b800,#009739)] bg-[length:200%_100%] bg-clip-text text-transparent">
          Brasil
        </span>
        .
      </SectionHeading>
      <Lead
        size="lg"
        className="max-w-[600px] animate-[tpUp_.9s_cubic-bezier(.22,1,.36,1)_.14s_both]"
      >
        Nossa missão é simplificar a gestão de frotas e de entregas com uma
        plataforma integrada, do escritório ao motorista em campo.
      </Lead>
      <div className="flex animate-[tpUp_.9s_cubic-bezier(.22,1,.36,1)_.22s_both] flex-wrap justify-center gap-2.5">
        <ArrowLink
          href="/gestao-de-frotas"
          variant="surface"
          size="md"
          arrow={false}
        >
          <span aria-hidden className="size-2 rounded-[2px] bg-site-violet" />
          Gestão de Frotas
        </ArrowLink>
        <ArrowLink
          href="/gestao-de-entregas"
          variant="surface"
          size="md"
          arrow={false}
        >
          <span aria-hidden className="size-2 rounded-full bg-site-pink" />
          Gestão de Entregas
        </ArrowLink>
      </div>
    </div>

    {/* Floating facts: decoration of the same facts the page tells below. */}
    <div aria-hidden="true" className="hidden min-[1100px]:block">
      <div
        data-par="0.22"
        className="absolute left-[clamp(16px,4vw,64px)] top-[24%] will-change-transform"
      >
        <div
          className={cn(
            CARD,
            "flex animate-[tpFloat_7s_ease-in-out_infinite] items-center gap-3 rounded-[18px] py-3 pl-3 pr-4 shadow-[0_30px_60px_-28px_rgba(14,14,30,.4)]",
          )}
        >
          <div className="flex">
            {PARTNERS.map((person, index) => (
              <Image
                key={person.id}
                src={person.photo}
                alt=""
                width={34}
                height={34}
                sizes="34px"
                className={cn(
                  "size-[34px] rounded-full border-2 border-site-surface object-cover",
                  index && "-ml-2.5",
                )}
              />
            ))}
          </div>
          <div className="text-left">
            <p className="m-0 text-[13px] font-semibold">Quatro sócios</p>
            <p className="m-0 text-xs text-site-muted">
              Produto, engenharia, infra e vendas
            </p>
          </div>
        </div>
      </div>
      <div
        data-par="0.32"
        className="absolute right-[clamp(16px,4vw,72px)] top-[20%] will-change-transform"
      >
        <div
          className={cn(
            CARD,
            "flex animate-[tpFloat_6s_ease-in-out_-2s_infinite] items-center gap-2.5 py-2.5 pl-2.5 pr-3.5",
          )}
        >
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-site-pink-soft text-site-pink">
            <Package className="size-4" />
          </span>
          <div className="text-left">
            <p className="m-0 font-site-mono text-[10.5px] tracking-[.08em] text-site-muted">
              2026
            </p>
            <p className="m-0 text-[13px] font-semibold">
              Chega a Gestão de Entregas
            </p>
          </div>
        </div>
      </div>
      <div
        data-par="0.16"
        className="absolute bottom-[14%] left-[clamp(40px,9vw,150px)] will-change-transform"
      >
        <div
          className={cn(
            CARD,
            "flex animate-[tpFloat_8s_ease-in-out_-4s_infinite] items-center gap-2.5 py-2.5 pl-2.5 pr-3.5",
          )}
        >
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-site-soft2">
            <Globe className="size-4" />
          </span>
          <div className="text-left">
            <p className="m-0 text-[13px] font-semibold">100% digital</p>
            <p className="m-0 text-xs text-site-muted">
              Atendimento em todo o Brasil
            </p>
          </div>
        </div>
      </div>
      <div
        data-par="0.26"
        className="absolute bottom-[17%] right-[clamp(40px,8vw,140px)] will-change-transform"
      >
        <div
          className={cn(
            CARD,
            "flex animate-[tpFloat_6.5s_ease-in-out_-1s_infinite] items-center gap-2.5 px-3.5 py-2.5",
          )}
        >
          <span className="flex gap-[3px]">
            <span className="size-2 rounded-[2px] bg-site-violet" />
            <span className="size-2 rounded-full bg-site-pink" />
          </span>
          <p className="m-0 whitespace-nowrap text-[13px] font-semibold">
            Frotas, Entregas ou os dois
          </p>
        </div>
      </div>
    </div>

    <a
      href="#quem-somos"
      aria-label="Ir para Quem somos"
      className="absolute bottom-7 left-1/2 -ml-5 flex size-10 animate-[tpBob_2.2s_ease-in-out_infinite] items-center justify-center rounded-full border border-site-line2 text-site-muted outline-none transition-colors hover:text-site-ink focus-visible:ring-2 focus-visible:ring-site-ink/40"
    >
      <ArrowDown aria-hidden className="size-4" />
    </a>
  </ParallaxSection>
);

export { AboutHero };
