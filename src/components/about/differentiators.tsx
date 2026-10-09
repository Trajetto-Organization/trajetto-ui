import { Clock } from "lucide-react";

import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { DARK_BAND, DarkGrid } from "@/components/site/institutional/dark-band";
import { SpotlightCard } from "@/components/site/institutional/motion";
import { SupportStatusLine } from "@/components/site/institutional/support-status";
import { cn } from "@/lib/utils";

/**
 * Sobre · Diferenciais: a dark band (in both themes) with three cards whose
 * light follows the pointer. The bars grow in when they scroll into view.
 */

const BARS = [38, 52, 44, 70, 58, 82, 64, 90, 76];

const CARD =
  "relative flex min-h-[320px] flex-col overflow-hidden rounded-3xl border border-white/[.08] bg-[#121218] p-7";

const Glow = ({ tint }: { tint: string }) => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0"
    style={{
      background: `radial-gradient(360px circle at var(--mx,-200px) var(--my,-200px),${tint},transparent 60%)`,
    }}
  />
);

const CardText = ({ title, children }: { title: string; children: string }) => (
  <>
    <h3 className="relative m-0 mt-auto pt-10 font-site-display text-[26px] font-medium tracking-[-.02em]">
      {title}
    </h3>
    <p
      className={cn(
        "relative m-0 mt-2.5 text-[15.5px] leading-[1.6]",
        DARK_BAND.body,
      )}
    >
      {children}
    </p>
  </>
);

const AboutDifferentiators = (): JSX.Element => (
  <section
    aria-labelledby="dif-titulo"
    className={cn(
      "relative overflow-hidden bg-[#0b0b10] px-[clamp(20px,4vw,40px)] py-[clamp(80px,11vw,140px)]",
      DARK_BAND.ink,
    )}
  >
    <DarkGrid />
    <div className="relative mx-auto max-w-[1200px]">
      <Reveal className="max-w-[720px]">
        <Eyebrow tone="dark-band" className="mb-4">
          NOSSOS DIFERENCIAIS
        </Eyebrow>
        <SectionHeading
          id="dif-titulo"
          className="text-[clamp(34px,4.6vw,62px)] leading-[1.02]"
        >
          Uma plataforma, uma equipe, uma operação à vista.
        </SectionHeading>
      </Reveal>
      <div className="mt-[clamp(40px,6vw,64px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
        <Reveal>
          <SpotlightCard className={cn(CARD, "h-full")}>
            <Glow tint="rgba(155,125,255,.16)" />
            <div className="relative flex h-14 items-center">
              <span className="flex items-center gap-2 rounded-full bg-[rgba(155,125,255,.16)] px-3.5 py-[9px] text-[13px] font-semibold text-[#c4b5fd]">
                <span
                  aria-hidden
                  className="size-[7px] rounded-[2px] bg-[#9b7dff]"
                />
                Frotas
              </span>
              <span
                aria-hidden
                className="z-[1] -mx-1.5 flex size-7 items-center justify-center rounded-full border border-white/[.14] bg-[#0b0b10] text-sm text-[#9d9fab]"
              >
                +
              </span>
              <span className="flex items-center gap-2 rounded-full bg-[rgba(240,85,142,.16)] px-3.5 py-[9px] text-[13px] font-semibold text-[#f9a8c9]">
                <span
                  aria-hidden
                  className="size-[7px] rounded-full bg-[#f0558e]"
                />
                Entregas
              </span>
            </div>
            <CardText title="Gestão Integrada">
              Frota e entregas no mesmo lugar: veículos, motoristas, manutenção,
              abastecimento, rotas e comprovantes.
            </CardText>
          </SpotlightCard>
        </Reveal>

        <Reveal delay={90}>
          <SpotlightCard className={cn(CARD, "h-full")}>
            <Glow tint="rgba(255,255,255,.1)" />
            <div className="relative flex h-14 items-end gap-1.5">
              <div aria-hidden className="flex h-full flex-1 items-end gap-1.5">
                {BARS.map((height, index) => (
                  <Reveal
                    key={index}
                    variant="grow-y"
                    delay={250 + index * 70}
                    className="max-w-4 flex-1 rounded-[4px_4px_1px_1px]"
                    style={{
                      height: `${height}%`,
                      background:
                        index === 7
                          ? "#f3f3f6"
                          : `rgba(255,255,255,${(0.14 + index * 0.03).toFixed(2)})`,
                    }}
                  />
                ))}
              </div>
              <span className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-[#9d9fab]">
                <span aria-hidden className="relative flex size-[7px]">
                  <span className="absolute inset-0 animate-tp-live rounded-full bg-emerald-500" />
                  <span className="relative size-[7px] rounded-full bg-emerald-500" />
                </span>
                Ao vivo
              </span>
            </div>
            <CardText title="Operação à vista">
              Torre de controle, painel do dia e registro de atividades para
              saber o que aconteceu, onde e com quem.
            </CardText>
          </SpotlightCard>
        </Reveal>

        <Reveal delay={180}>
          <SpotlightCard className={cn(CARD, "h-full")}>
            <Glow tint="rgba(240,85,142,.16)" />
            <div className="relative flex h-14 items-center gap-3">
              <span
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-white/[.08] bg-white/[.06]"
              >
                <Clock className="size-5 text-[#f3f3f6]" />
              </span>
              <div>
                <p className="m-0 font-site-mono text-[13px]">
                  Seg–Sex · 09h–18h
                </p>
                <SupportStatusLine />
              </div>
            </div>
            <CardText title="Suporte Dedicado">
              Equipe especializada disponível de segunda a sexta, das 09h às
              18h, com atendimento rápido e personalizado.
            </CardText>
          </SpotlightCard>
        </Reveal>
      </div>
    </div>
  </section>
);

export { AboutDifferentiators };
