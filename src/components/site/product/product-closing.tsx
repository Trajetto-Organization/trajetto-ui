import Image from "next/image";

import { ArrowLink, MovingArrow } from "@/components/site/arrow-link";
import { SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { DocumentLink } from "@/components/shared/document-link";

import trajettoLogo from "@/assets/logo/trajetto-logo.png";

import type { ProductContent } from "./content";

/** The card that leads to the other module (same drivers, vehicles and app). */
const OtherModule = ({ product }: { product: ProductContent }): JSX.Element => {
  const { other } = product;
  const Icon = other.icon;

  return (
    <section
      aria-labelledby="outro-titulo"
      className="px-[clamp(20px,4vw,40px)] py-[clamp(24px,4vw,48px)]"
    >
      <Reveal className="mx-auto max-w-[1200px]">
        <DocumentLink
          href={other.href}
          className="group/arrow grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-center gap-6 rounded-[28px] border border-site-line bg-site-surface p-[clamp(24px,4vw,40px)] outline-none transition-[transform,border-color] [transition-duration:350ms] ease-site hover:-translate-y-[3px] hover:border-site-line2 focus-visible:ring-2 focus-visible:ring-site-ink/40 motion-reduce:hover:translate-y-0"
        >
          <div className="flex items-start gap-5">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--other-soft)] text-[var(--other)]">
              <Icon aria-hidden className="size-6" />
            </span>
            <div>
              <h2
                id="outro-titulo"
                className="m-0 font-site-display text-[clamp(26px,2.8vw,36px)] font-medium tracking-[-.025em]"
              >
                {other.title}
              </h2>
              <p className="mb-0 mt-2 text-base leading-[1.6] text-site-muted">
                {other.description}
              </p>
            </div>
          </div>
          <div className="flex justify-start min-[720px]:justify-end">
            <span className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-[14px] border border-site-line2 px-5 py-3.5 font-medium transition-colors duration-300 group-hover/arrow:bg-site-bg">
              Conhecer {other.name}
              <MovingArrow />
            </span>
          </div>
        </DocumentLink>
      </Reveal>
    </section>
  );
};

/** The closing dark band with the call to action and the big logo mark. */
const ProductCta = ({ product }: { product: ProductContent }): JSX.Element => (
  <section
    aria-labelledby="cta-titulo"
    className="px-[clamp(12px,3vw,24px)] pb-[clamp(24px,4vw,40px)] pt-[clamp(40px,6vw,72px)]"
  >
    <Reveal className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[clamp(24px,3vw,36px)] bg-[#0e0e14] px-[clamp(24px,6vw,80px)] py-[clamp(48px,7vw,96px)] text-[#f5f5f7]">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 80% at 100% 100%, rgba(216,27,96,.22), transparent 70%), radial-gradient(40% 60% at 85% 0%, rgba(106,63,224,.22), transparent 70%)",
        }}
      />
      <Image
        src={trajettoLogo}
        alt=""
        aria-hidden
        width={620}
        height={620}
        sizes="(min-width: 900px) 620px, 70vw"
        className="pointer-events-none absolute right-[-8%] top-1/2 h-auto w-[min(620px,70%)] -translate-y-1/2 opacity-90"
      />
      <div className="relative max-w-[620px]">
        <SectionHeading id="cta-titulo" size="xl">
          {product.ctaTitle}
        </SectionHeading>
        <p className="mb-0 mt-[22px] max-w-[500px] text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-[#c4c5cf]">
          {product.ctaDescription}
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
    </Reveal>
  </section>
);

export { OtherModule, ProductCta };
