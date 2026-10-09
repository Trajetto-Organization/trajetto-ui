import Image from "next/image";

import { ArrowLink } from "@/components/site/arrow-link";
import { PanelMockup } from "@/components/site/panel-mockup";
import { SectionHeader, SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";

import trajettoLogo from "@/assets/logo/trajetto-logo.png";

import { TiltStage } from "./tilt-stage";

/** "Painel web": both modules on one dashboard, tilting toward the pointer. */
const HomePanel = (): JSX.Element => (
  <section
    aria-labelledby="painel-titulo"
    className="px-[clamp(20px,4vw,40px)] pb-[clamp(40px,6vw,64px)] pt-[clamp(80px,11vw,140px)]"
  >
    <Reveal>
      <SectionHeader
        id="painel-titulo"
        align="center"
        eyebrow="PAINEL WEB"
        title="Frotas e entregas no mesmo painel."
        lead="A operação do dia e a situação da frota lado a lado, com os nomes que a sua equipe vê no Trajetto."
        className="[&>p:last-child]:max-w-[560px]"
      />
    </Reveal>
    <Reveal
      delay={100}
      className="mx-auto mt-[clamp(40px,6vw,64px)] max-w-[1080px]"
    >
      <TiltStage>
        <PanelMockup />
      </TiltStage>
    </Reveal>
  </section>
);

/** The closing band: dark in both themes, the logo large behind the copy. */
const HomeCta = (): JSX.Element => (
  <section
    aria-labelledby="cta-titulo"
    className="px-[clamp(12px,3vw,24px)] pb-[clamp(24px,4vw,40px)] pt-[clamp(40px,6vw,72px)]"
  >
    <Reveal className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[clamp(24px,3vw,36px)] bg-[#0e0e14] px-[clamp(24px,6vw,80px)] py-[clamp(48px,7vw,96px)] text-[#f5f5f7]">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(50%_80%_at_100%_100%,rgba(216,27,96,.22),transparent_70%),radial-gradient(40%_60%_at_85%_0%,rgba(106,63,224,.22),transparent_70%)]"
      />
      <Image
        src={trajettoLogo}
        alt=""
        aria-hidden
        sizes="(min-width: 900px) 620px, 70vw"
        className="pointer-events-none absolute right-[-8%] top-1/2 h-auto w-[min(620px,70%)] -translate-y-1/2 opacity-90"
      />
      <div className="relative max-w-[620px]">
        <SectionHeading id="cta-titulo" size="xl">
          Frota e entregas no mesmo lugar.
        </SectionHeading>
        <p className="m-0 mt-[22px] max-w-[500px] text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-[#c4c5cf]">
          Conte como é a sua operação e montamos a proposta com os módulos que
          fazem sentido para você.
        </p>
        <div className="mt-[34px] flex flex-wrap gap-3">
          <ArrowLink
            href="/orcamento"
            variant="light"
            className="focus-visible:ring-offset-[#0e0e14]"
          >
            Solicitar orçamento
          </ArrowLink>
          <ArrowLink
            href="/contato"
            variant="ghost-dark"
            arrow={false}
            className="px-5 focus-visible:ring-offset-[#0e0e14]"
          >
            Falar com a equipe
          </ArrowLink>
        </div>
      </div>
    </Reveal>
  </section>
);

export { HomeCta, HomePanel };
