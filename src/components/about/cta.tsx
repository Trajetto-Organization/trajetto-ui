import Image from "next/image";

import logo from "@/assets/logo/trajetto-logo.png";
import { ArrowLink } from "@/components/site/arrow-link";
import { SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";

/** Sobre · closing call: a dark rounded band with the mark bleeding off the right edge. */
const AboutCta = (): JSX.Element => (
  <section
    aria-labelledby="cta-titulo"
    className="px-[clamp(12px,3vw,24px)] pb-[clamp(24px,4vw,40px)] pt-[clamp(40px,6vw,72px)]"
  >
    <Reveal className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[clamp(24px,3vw,36px)] bg-[#0e0e14] px-[clamp(24px,6vw,80px)] py-[clamp(48px,7vw,96px)] text-[#f5f5f7]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(50%_80%_at_100%_100%,rgba(216,27,96,.22),transparent_70%),radial-gradient(40%_60%_at_85%_0%,rgba(106,63,224,.22),transparent_70%)]"
      />
      <Image
        src={logo}
        alt=""
        aria-hidden="true"
        sizes="620px"
        className="pointer-events-none absolute right-[-8%] top-1/2 h-auto w-[min(620px,70%)] -translate-y-1/2 opacity-90 max-[640px]:opacity-25"
      />
      <div className="relative max-w-[620px]">
        <SectionHeading
          id="cta-titulo"
          size="xl"
          className="text-[clamp(36px,5vw,68px)] leading-none"
        >
          Vamos fazer parte da sua operação.
        </SectionHeading>
        <p className="m-0 mt-[22px] max-w-[500px] text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-[#c4c5cf]">
          Conte como é a sua operação e montamos a proposta com os módulos que
          fazem sentido para você.
        </p>
        <div className="mt-[34px] flex flex-wrap gap-3">
          <ArrowLink href="/orcamento" variant="light">
            Solicitar orçamento
          </ArrowLink>
          <ArrowLink href="/contato" variant="ghost-dark" arrow={false}>
            Falar com a equipe
          </ArrowLink>
        </div>
      </div>
    </Reveal>
  </section>
);

export { AboutCta };
