import { Check } from "lucide-react";

import { ArrowLink } from "@/components/site/arrow-link";
import { PhoneMockup } from "@/components/site/phone-mockup";
import { Lead, SectionHeading } from "@/components/site/primitives";
import { cn } from "@/lib/utils";

import type { ProductContent, StatusTone } from "./content";
import { HeroCount, HeroStage } from "./hero-stage";

/**
 * Status pills of the dashboard card: a 12% tint of the status colour and
 * its text. The design's -600 text was 3.4–3.9:1 at 11.5px; -700 in light
 * and -400 in dark clear AA on the tint in each theme.
 */
const TONES: Record<StatusTone, string> = {
  green:
    "bg-[#10b981]/[.12] text-[#047857] dark:bg-[#10b981]/[.16] dark:text-[#34d399]",
  sky: "bg-[#0ea5e9]/[.12] text-[#0369a1] dark:bg-[#0ea5e9]/[.16] dark:text-[#38bdf8]",
  violet:
    "bg-[#8b5cf6]/[.12] text-[#6d28d9] dark:bg-[#8b5cf6]/[.18] dark:text-[#a78bfa]",
  red: "bg-[#ef4444]/[.12] text-[#b91c1c] dark:bg-[#ef4444]/[.16] dark:text-[#f87171]",
  slate:
    "bg-[#64748b]/[.14] text-[#475569] dark:bg-[#64748b]/[.2] dark:text-[#94a3b8]",
};

// Below 760px the card keeps three columns (id, name, status), as the design.
const COLUMNS =
  "grid-cols-[76px_minmax(0,1fr)_92px] min-[760px]:grid-cols-[88px_minmax(0,1.3fr)_minmax(0,1.2fr)_80px_96px]";

/** The product hero: title, calls to action and the floating dashboard. */
const ProductHero = ({ product }: { product: ProductContent }): JSX.Element => {
  const { card, chipA, chipB } = product;
  const ModuleIcon = product.icon;
  const ChipAIcon = chipA.icon;
  const ChipBIcon = chipB.icon;

  return (
    <HeroStage
      labelledBy="produto-titulo"
      className="relative overflow-hidden px-[clamp(20px,4vw,40px)] pt-[clamp(120px,16vh,170px)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 40% at 50% 62%, var(--acc-glow), transparent 70%), radial-gradient(35% 30% at 20% 20%, var(--site-glow-b), transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex max-w-[920px] flex-col items-center gap-[26px] text-center">
        <div className="inline-flex animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_both] items-center gap-2.5 whitespace-nowrap rounded-full border border-site-line2 bg-site-surface py-[5px] pl-[5px] pr-3.5 text-[13px] font-medium text-site-muted">
          <span className="flex size-[26px] items-center justify-center rounded-full bg-[var(--acc-soft)] text-[var(--acc)]">
            <ModuleIcon aria-hidden className="size-[15px]" />
          </span>
          {product.name}
        </div>

        <SectionHeading
          id="produto-titulo"
          size="hero"
          // Inter Tight runs ~6% wider than the design's SF Pro: on wide screens
          // the title gets 1000px (centered overflow of the 920px column) so it
          // keeps the design's two lines.
          className="shrink-0 animate-tp-up [animation-delay:50ms] min-[1100px]:w-[1000px]"
        >
          {product.titleA}
          <span className="text-[var(--acc)]">{product.titleB}</span>.
        </SectionHeading>

        <Lead
          size="lg"
          className="max-w-[640px] animate-tp-up leading-[1.6] [animation-delay:120ms]"
        >
          {product.description}
        </Lead>

        <div className="flex animate-tp-up flex-wrap justify-center gap-3 [animation-delay:200ms]">
          <ArrowLink href="/orcamento">Solicitar orçamento</ArrowLink>
          <ArrowLink
            href="#como-funciona"
            variant="secondary"
            arrow={false}
            className="px-5"
          >
            Ver como funciona
          </ArrowLink>
        </div>

        <ul className="m-0 flex animate-tp-up list-none flex-wrap justify-center gap-x-[22px] gap-y-2.5 p-0 [animation-delay:280ms]">
          {product.highlights.map((highlight) => (
            <li
              key={highlight}
              className="flex items-center gap-2 text-sm text-site-muted"
            >
              <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--acc-soft)] text-[var(--acc)]">
                <Check aria-hidden className="size-3.5" strokeWidth={3} />
              </span>
              {highlight}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mx-auto mt-[clamp(56px,7vw,84px)] h-[clamp(420px,50vw,600px)] max-w-[1180px] animate-[tpUp_1.1s_cubic-bezier(.22,1,.36,1)_.25s_both]">
        <div
          data-par="0.04"
          className="absolute left-1/2 top-0 ml-[calc(min(900px,96%)/-2)] w-[min(900px,96%)] will-change-transform"
        >
          <div className="rounded-[22px] border border-site-line bg-site-surface p-[clamp(14px,2vw,22px)] text-left shadow-[0_30px_80px_-30px_rgba(14,14,30,.28),0_12px_24px_-16px_rgba(14,14,30,.18)]">
            <div className="flex items-center justify-between gap-3 border-b border-site-line pb-3.5">
              <div className="flex min-w-0 items-center gap-2">
                {/* The window dots give way to the title on small phones. */}
                <span className="flex shrink-0 gap-2 max-[360px]:hidden">
                  <span className="size-2.5 rounded-full bg-site-line2" />
                  <span className="size-2.5 rounded-full bg-site-line2" />
                  <span className="size-2.5 rounded-full bg-site-line2" />
                </span>
                <span className="ml-2 truncate whitespace-nowrap text-[13px] font-semibold max-[420px]:ml-0">
                  {card.title}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-site-muted">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-tp-live rounded-full bg-[#10b981]" />
                  <span className="relative size-2 rounded-full bg-[#10b981]" />
                </span>
                Atualizado agora
              </span>
            </div>

            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
              {card.kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-[14px] border border-site-line bg-site-soft px-3.5 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-site-muted">{kpi.label}</span>
                    <span
                      className="size-[7px] shrink-0 rounded-full"
                      style={{ background: kpi.dot }}
                    />
                  </div>
                  <HeroCount
                    value={kpi.value}
                    className="mb-0 mt-1 font-site-display text-[28px] tabular-nums tracking-[-.02em]"
                  />
                </div>
              ))}
            </div>

            <div className="mt-3.5 overflow-hidden rounded-[14px] border border-site-line">
              <div
                className={cn(
                  "grid gap-3 bg-site-soft px-3.5 py-2.5 text-[11.5px] font-medium text-site-muted",
                  COLUMNS,
                )}
              >
                <span>{card.headers.a}</span>
                <span>{card.headers.b}</span>
                <span className="hidden min-[760px]:block">
                  {card.headers.c}
                </span>
                <span className="hidden min-[760px]:block">
                  {card.headers.d}
                </span>
                <span className="text-right">Status</span>
              </div>
              {card.rows.map((row, index) => (
                <div
                  key={row.a}
                  className={cn(
                    "grid animate-[tpRise_.6s_cubic-bezier(.22,1,.36,1)_backwards] items-center gap-3 border-t border-site-line px-3.5 py-3 text-[13px]",
                    COLUMNS,
                  )}
                  style={{ animationDelay: `${500 + index * 110}ms` }}
                >
                  <span className="whitespace-nowrap font-site-mono text-xs">
                    {row.a}
                  </span>
                  <span className="truncate font-semibold">{row.b}</span>
                  <span className="hidden truncate text-site-muted min-[760px]:block">
                    {row.c}
                  </span>
                  <span className="hidden whitespace-nowrap font-site-mono text-xs text-site-muted min-[760px]:block">
                    {row.d}
                  </span>
                  <span
                    className={cn(
                      "justify-self-end whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11.5px] font-medium",
                      TONES[row.tone],
                    )}
                  >
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Phone and chips: from 760px, where they have room beside the card. */}
        <div
          data-par="0.16"
          className="absolute right-0 top-[clamp(50px,7vw,100px)] hidden w-[clamp(180px,19vw,240px)] will-change-transform min-[760px]:block"
        >
          <PhoneMockup screen={product.phone} />
        </div>
        <div
          data-par="0.3"
          aria-hidden
          className="absolute left-[4%] top-[clamp(10px,2vw,30px)] hidden will-change-transform min-[760px]:block"
        >
          <div className="flex animate-[tpFloat_7s_ease-in-out_-2s_infinite] items-center gap-2.5 rounded-[14px] border border-site-line bg-site-surface py-2.5 pl-2.5 pr-3.5 text-left shadow-[0_24px_50px_-24px_rgba(14,14,30,.45)]">
            <span className="flex size-8 items-center justify-center rounded-[10px] bg-[var(--acc-soft)] text-[var(--acc)]">
              <ChipAIcon className="size-4" />
            </span>
            <div>
              <p className="m-0 whitespace-nowrap text-[12.5px] font-semibold">
                {chipA.title}
              </p>
              <p className="m-0 whitespace-nowrap text-[11.5px] text-site-muted">
                {chipA.sub}
              </p>
            </div>
          </div>
        </div>
        <div
          data-par="0.22"
          aria-hidden
          className="absolute left-0 top-[clamp(200px,24vw,300px)] hidden will-change-transform min-[760px]:block"
        >
          <div className="flex animate-[tpFloat_6s_ease-in-out_infinite] items-center gap-2.5 rounded-2xl border border-site-line bg-site-surface py-3 pl-3 pr-4 text-left shadow-[0_30px_60px_-28px_rgba(14,14,30,.45)]">
            <span className="flex size-[34px] items-center justify-center rounded-[10px] bg-site-ink text-site-bg">
              <ChipBIcon className="size-[17px]" />
            </span>
            <div>
              <p className="m-0 whitespace-nowrap text-[13px] font-semibold">
                {chipB.title}
              </p>
              <p className="m-0 whitespace-nowrap text-xs text-site-muted">
                {chipB.sub}
              </p>
            </div>
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 -right-10 bottom-0 h-[40%]"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgb(var(--site-bg)) 88%)",
          }}
        />
      </div>
    </HeroStage>
  );
};

export { ProductHero };
