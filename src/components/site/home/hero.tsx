import { Check, Gauge, QrCode } from "lucide-react";

import { ArrowLink } from "@/components/site/arrow-link";
import { PanelMockup } from "@/components/site/panel-mockup";
import { PhoneMockup } from "@/components/site/phone-mockup";

import { HeroParallax } from "./hero-parallax";
import { BrasilWord } from "./brasil-word";

/**
 * The landing hero (design: Hero B · Camadas, the design's default): the
 * statement, the two calls to action and the product in layers below it,
 * the web panel in front with the driver's phone, the AI odometer reading
 * and the PDF proof floating around it. Entrances are CSS (they run before
 * hydration); the layers' drift is the client island HeroParallax.
 */
const HomeHero = (): JSX.Element => (
  <HeroParallax className="relative overflow-hidden px-[clamp(20px,4vw,40px)] pt-[clamp(120px,16vh,170px)]">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_62%,var(--site-glow-a),transparent_70%),radial-gradient(40%_30%_at_70%_80%,var(--site-glow-b),transparent_70%)]"
    />

    <div className="relative mx-auto flex max-w-[900px] flex-col items-center gap-[26px] text-center">
      <p className="m-0 inline-flex max-w-full animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_both] items-center gap-2.5 whitespace-nowrap rounded-full border border-site-line2 bg-site-surface py-1.5 pl-2.5 pr-3.5 text-[clamp(11.5px,3.6vw,13px)] font-medium text-site-muted">
        <span aria-hidden className="flex shrink-0 gap-[3px]">
          <span className="size-[7px] rounded-[2px] bg-site-violet" />
          <span className="size-[7px] rounded-full bg-site-pink" />
        </span>
        Frotas e entregas na mesma plataforma
      </p>

      <h1
        id="hero-titulo"
        className="m-0 animate-[tpUp_.9s_cubic-bezier(.22,1,.36,1)_.05s_both] font-site-display text-[clamp(46px,7.4vw,104px)] font-medium leading-[.95] tracking-[-.045em] [text-wrap:balance]"
      >
        Frota e entregas no mesmo trajeto.
      </h1>

      <p className="m-0 max-w-[620px] animate-[tpUp_.9s_cubic-bezier(.22,1,.36,1)_.12s_both] text-[clamp(17px,1.5vw,20px)] leading-[1.6] text-site-muted [text-wrap:pretty]">
        Do abastecimento ao comprovante de entrega: painel web para a operação e
        app Android para o motorista. Uma plataforma pensada para quem move o{" "}
        <BrasilWord />.
      </p>

      <div className="flex animate-[tpUp_.9s_cubic-bezier(.22,1,.36,1)_.2s_both] flex-wrap justify-center gap-3">
        <ArrowLink href="/orcamento" className="!shadow-none">
          Solicitar orçamento
        </ArrowLink>
        <ArrowLink
          href="#modulos"
          variant="secondary"
          arrow={false}
          className="px-5"
        >
          Ver como funciona
        </ArrowLink>
      </div>
    </div>

    <div className="relative mx-auto mt-[clamp(56px,7vw,88px)] h-[clamp(440px,54vw,640px)] max-w-[1180px] animate-[tpUp_1.1s_cubic-bezier(.22,1,.36,1)_.25s_both]">
      <div
        data-par="0.04"
        className="absolute left-1/2 top-0 ml-[calc(min(940px,96%)/-2)] w-[min(940px,96%)] will-change-transform"
      >
        <PanelMockup />
      </div>

      {/* The floating layers need room beside the panel: from 760px, as in the design. */}
      <div
        data-par="0.16"
        className="absolute right-0 top-[clamp(60px,8vw,110px)] hidden w-[clamp(180px,19vw,240px)] will-change-transform min-[760px]:block"
      >
        <PhoneMockup screen="proof" />
      </div>

      <div
        data-par="0.24"
        className="absolute left-0 top-[clamp(170px,20vw,260px)] hidden will-change-transform min-[760px]:block"
      >
        <div
          role="img"
          aria-label="Leitura de odômetro: a IA leu 187.450 km na foto, que confere com o valor informado."
          className="w-[250px] animate-[tpFloat_6s_ease-in-out_infinite] rounded-[18px] border border-site-line bg-site-surface p-4 text-left shadow-[0_30px_60px_-28px_rgba(14,14,30,.45)]"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-[34px] items-center justify-center rounded-[10px] bg-site-violet-soft text-site-violet">
              <Gauge aria-hidden className="size-[17px]" />
            </span>
            <div>
              <p className="m-0 text-[13px] font-semibold">
                Leitura de odômetro
              </p>
              <p className="m-0 text-[11.5px] text-site-muted">
                IA comparou com o digitado
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between rounded-xl bg-[#0f0f15] px-3 py-2.5 text-white">
            <span className="font-site-mono text-xl tracking-[.08em]">
              187.450
            </span>
            <span className="text-[11px] text-[#a1a1aa]">km</span>
          </div>
          <p className="m-0 mt-2.5 flex items-center gap-1.5 text-xs font-medium text-[#047857] dark:text-[#34d399]">
            <Check aria-hidden className="size-3.5" strokeWidth={2.4} />
            Confere com o valor informado
          </p>
        </div>
      </div>

      <div
        data-par="0.3"
        className="absolute left-[8%] top-[clamp(20px,3vw,40px)] hidden will-change-transform min-[760px]:block"
      >
        <div className="flex animate-[tpFloat_7s_ease-in-out_-2s_infinite] items-center gap-2.5 rounded-[14px] border border-site-line bg-site-surface py-2.5 pl-2.5 pr-3.5 text-left shadow-[0_24px_50px_-24px_rgba(14,14,30,.45)]">
          <span className="flex size-[30px] items-center justify-center rounded-[9px] bg-site-pink-soft text-site-pink">
            <QrCode aria-hidden className="size-4" />
          </span>
          <div>
            <p className="m-0 text-[12.5px] font-semibold">
              Comprovante em PDF
            </p>
            <p className="m-0 text-[11.5px] text-site-muted">
              SHA-256 e QR de conferência
            </p>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 bottom-0 h-[42%] bg-[linear-gradient(to_bottom,transparent,rgb(var(--site-bg))_88%)]"
      />
    </div>
  </HeroParallax>
);

export { HomeHero };
