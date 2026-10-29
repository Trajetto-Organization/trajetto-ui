import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

import type { ProductContent } from "./content";
import { SpotlightCard } from "./spotlight-card";

/** "Recursos": every feature of the module, in a grid of spotlight cards. */
const ProductFeatures = ({
  product,
}: {
  product: ProductContent;
}): JSX.Element => (
  <section
    aria-labelledby="recursos-titulo"
    className="px-[clamp(20px,4vw,40px)] pb-[clamp(80px,10vw,128px)] pt-[clamp(40px,6vw,72px)]"
  >
    <div className="mx-auto max-w-[1200px]">
      <Reveal className="mb-[clamp(36px,5vw,56px)] flex flex-wrap items-end justify-between gap-x-12 gap-y-5">
        <div className="max-w-[640px]">
          <Eyebrow className="mb-4">RECURSOS</Eyebrow>
          <SectionHeading id="recursos-titulo">
            {product.featuresTitle}
          </SectionHeading>
        </div>
        <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-site-line2 px-3.5 py-2 text-[13.5px] font-medium">
          <span
            aria-hidden
            className={cn(
              "size-2 bg-[var(--acc)]",
              product.module === "frotas" ? "rounded-[2px]" : "rounded-full",
            )}
          />
          {product.features.length} recursos
        </span>
      </Reveal>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
        {product.features.map((feature, index) => {
          const Icon = feature.icon;

          return (
            <SpotlightCard
              key={feature.title}
              delay={(index % 3) * 70}
              className="rounded-[22px] border border-site-line bg-site-surface p-6 transition-[border-color,transform] duration-300 hover:-translate-y-[3px] hover:border-site-line2 motion-reduce:hover:translate-y-0"
            >
              <span className="relative flex size-[42px] items-center justify-center rounded-[13px] bg-[var(--acc-soft)] text-[var(--acc)]">
                <Icon aria-hidden className="size-5" />
              </span>
              <h3 className="relative mb-0 mt-5 text-[17px] font-semibold tracking-[-.01em]">
                {feature.title}
              </h3>
              <p className="relative mb-0 mt-1.5 text-[14.5px] leading-[1.55] text-site-muted [text-wrap:pretty]">
                {feature.description}
              </p>
            </SpotlightCard>
          );
        })}
      </div>
    </div>
  </section>
);

export { ProductFeatures };
