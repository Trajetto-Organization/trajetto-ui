import type { ReactNode } from "react";

import { Gauge, MapPin, Smartphone, WifiOff } from "lucide-react";

import { ArrowLink } from "@/components/site/arrow-link";
import { PhoneMockup } from "@/components/site/phone-mockup";
import { Lead, SectionHeading } from "@/components/site/primitives";
import { cn } from "@/lib/utils";

import { HeroParallax } from "./hero-parallax";

/** Module chip of the hero: violet square = Frotas, pink dot = Entregas. */
const Chip = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-site-line2 px-3 py-[7px] text-[13px]">
    {children}
  </span>
);

const FloatingCard = ({
  icon,
  title,
  meta,
  tone,
  className,
}: {
  icon: ReactNode;
  title: string;
  meta: string;
  tone: "violet" | "pink";
  className?: string;
}) => (
  <div
    className={cn(
      "flex items-center gap-2.5 rounded-[14px] border border-site-line bg-site-surface py-2.5 pl-2.5 pr-3.5 shadow-[0_24px_50px_-24px_rgba(14,14,30,.45)]",
      className,
    )}
  >
    <span
      className={cn(
        "flex size-8 items-center justify-center rounded-[10px]",
        tone === "violet"
          ? "bg-site-violet-soft text-site-violet"
          : "bg-site-pink-soft text-site-pink",
      )}
    >
      {icon}
    </span>
    <div>
      <p className="m-0 whitespace-nowrap text-[12.5px] font-semibold">
        {title}
      </p>
      <p className="m-0 whitespace-nowrap text-[11.5px] text-site-muted">
        {meta}
      </p>
    </div>
  </div>
);

/**
 * Hero of the driver app page: badge, title, lead, CTAs, module chips and
 * three phones (deliveries in front; refuelling and proof tilted behind
 * from 760px; two floating notes from 1100px, like the design).
 */
const AppHero = (): JSX.Element => (
  <HeroParallax
    aria-labelledby="app-titulo"
    className="relative overflow-hidden px-[clamp(20px,4vw,40px)] pt-[clamp(120px,16vh,170px)]"
  >
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_40%_at_30%_75%,var(--site-glow-a),transparent_70%),radial-gradient(40%_40%_at_70%_75%,var(--site-glow-b),transparent_70%)]"
    />
    <div className="relative mx-auto flex max-w-[900px] flex-col items-center gap-[26px] text-center">
      <p className="m-0 inline-flex animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_both] items-center gap-2.5 whitespace-nowrap rounded-full border border-site-line2 bg-site-surface py-[5px] pl-[5px] pr-3.5 text-[13px] font-medium text-site-muted">
        <span className="flex size-[26px] items-center justify-center rounded-full bg-site-ink text-site-bg">
          <Smartphone aria-hidden className="size-3.5" />
        </span>
        App do motorista · Android
      </p>
      <SectionHeading
        id="app-titulo"
        size="hero"
        className="animate-tp-up text-[clamp(44px,7.2vw,100px)] leading-[.96] [animation-delay:50ms]"
      >
        O registro feito onde a operação{" "}
        <span className="text-site-pink">acontece</span>.
      </SectionHeading>
      <Lead
        size="lg"
        className="max-w-[620px] animate-tp-up [animation-delay:120ms]"
      >
        Um aplicativo Android para as duas operações. A rota do dia, o
        comprovante, o abastecimento e o checklist, mesmo sem sinal.
      </Lead>
      <div className="flex animate-tp-up flex-wrap justify-center gap-3 [animation-delay:200ms]">
        <ArrowLink href="/orcamento">Solicitar orçamento</ArrowLink>
        <ArrowLink
          href="#telas"
          variant="secondary"
          arrow={false}
          className="px-5"
        >
          Ver as telas
        </ArrowLink>
      </div>
      <div className="flex animate-tp-up flex-wrap justify-center gap-2 [animation-delay:280ms]">
        <Chip>
          <span
            aria-hidden
            className="size-[7px] rounded-[2px] bg-site-violet"
          />
          Frotas
        </Chip>
        <Chip>
          <span aria-hidden className="size-[7px] rounded-full bg-site-pink" />
          Entregas
        </Chip>
        <Chip>
          <WifiOff aria-hidden className="size-3.5" />
          Funciona sem sinal
        </Chip>
      </div>
    </div>

    <div className="relative mx-auto mt-[clamp(56px,7vw,84px)] h-[clamp(420px,52vw,620px)] max-w-[1000px] animate-[tpUp_1.1s_cubic-bezier(.22,1,.36,1)_.25s_both]">
      <div
        data-par="0.14"
        className="absolute left-[8%] top-[clamp(60px,8vw,110px)] hidden w-[clamp(180px,20vw,240px)] will-change-transform min-[760px]:block"
      >
        <div className="-rotate-[8deg]">
          <PhoneMockup screen="fuel" />
        </div>
      </div>
      <div
        data-par="0.14"
        className="absolute right-[8%] top-[clamp(60px,8vw,110px)] hidden w-[clamp(180px,20vw,240px)] will-change-transform min-[760px]:block"
      >
        <div className="rotate-[8deg]">
          <PhoneMockup screen="proof" />
        </div>
      </div>
      <div
        data-par="0.05"
        className="absolute left-1/2 top-0 z-[1] ml-[calc(clamp(220px,25vw,290px)/-2)] w-[clamp(220px,25vw,290px)] will-change-transform"
      >
        <PhoneMockup screen="deliveries" />
      </div>
      <div
        data-par="0.3"
        aria-hidden
        className="absolute left-[-2%] top-[clamp(10px,2vw,30px)] z-[2] hidden will-change-transform min-[1100px]:block"
      >
        <FloatingCard
          tone="violet"
          icon={<Gauge aria-hidden className="size-4" />}
          title="Foto do odômetro"
          meta="Lida pela IA no servidor"
          className="animate-[tpFloat_7s_ease-in-out_-2s_infinite]"
        />
      </div>
      <div
        data-par="0.26"
        aria-hidden
        className="absolute right-[-2%] top-[clamp(300px,34vw,400px)] z-[2] hidden will-change-transform min-[1100px]:block"
      >
        <FloatingCard
          tone="pink"
          icon={<MapPin aria-hidden className="size-4" />}
          title="Localização registrada"
          meta="Junto do comprovante"
          className="animate-[tpFloat_6s_ease-in-out_infinite]"
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-[-40px] right-[-40px] z-[3] h-[38%] bg-[linear-gradient(to_bottom,transparent,rgb(var(--site-bg))_88%)]"
      />
    </div>
  </HeroParallax>
);

export { AppHero };
