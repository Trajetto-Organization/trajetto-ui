import Image from "next/image";

import { ArrowLink } from "@/components/site/arrow-link";
import { cn } from "@/lib/utils";

import trajettoLogo from "@/assets/logo/trajetto-logo.png";

/**
 * "Da leitura à operação.": the dark closing band of the blog and of each
 * article. Stays dark in both themes, like the design.
 */
const EditorialCtaBand = ({ className }: { className?: string }) => (
  <section
    aria-labelledby="cta-titulo"
    className={cn(
      "px-[clamp(12px,3vw,24px)] py-[clamp(24px,4vw,40px)]",
      className,
    )}
  >
    <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[clamp(24px,3vw,36px)] bg-[#0e0e14] px-[clamp(24px,6vw,80px)] py-[clamp(48px,7vw,96px)] text-[#f5f5f7]">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(50%_80%_at_100%_100%,rgba(216,27,96,.22),transparent_70%),radial-gradient(40%_60%_at_85%_0%,rgba(106,63,224,.22),transparent_70%)]"
      />
      <Image
        src={trajettoLogo}
        alt=""
        aria-hidden
        width={620}
        height={620}
        sizes="620px"
        className="pointer-events-none absolute right-[-8%] top-1/2 h-auto w-[min(620px,70%)] max-w-none -translate-y-1/2 opacity-90"
      />
      <div className="relative max-w-[620px]">
        <h2
          id="cta-titulo"
          className="m-0 font-site-display text-[clamp(36px,5vw,68px)] font-medium leading-none tracking-[-.04em] [text-wrap:balance]"
        >
          Da leitura à operação.
        </h2>
        <p className="mb-0 mt-[22px] max-w-[500px] text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-[#c4c5cf]">
          Veja como o Trajetto coloca essas práticas no dia a dia da sua frota e
          das suas entregas.
        </p>
        <div className="mt-[34px] flex flex-wrap gap-3">
          <ArrowLink href="/orcamento" variant="light">
            Solicitar orçamento
          </ArrowLink>
          <ArrowLink
            href="/contato"
            variant="ghost-dark"
            arrow={false}
            className="px-5"
          >
            Falar com a equipe
          </ArrowLink>
        </div>
      </div>
    </div>
  </section>
);

export { EditorialCtaBand };
