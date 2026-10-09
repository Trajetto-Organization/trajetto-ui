import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { SiteShell } from "@/components/site/site-shell";
import { buildPageMetadata } from "@/lib/page-metadata";
import { cn } from "@/lib/utils";

import { PRODUCTS, type ProductModule } from "./content";
import { productPageJsonLd } from "./json-ld";
import { ProductApp } from "./product-app";
import { OtherModule, ProductCta } from "./product-closing";
import { ProductDemo } from "./product-demo";
import { ProductFaq } from "./product-faq";
import { ProductFeatures } from "./product-features";
import { ProductFlow } from "./product-flow";
import { ProductHero } from "./product-hero";

/**
 * The product page (design: Trajetto Produto.dc.html), one implementation
 * for both modules. The module sets the accent: violet for frotas, pink for
 * entregas, and the "other module" color the other way round. They are
 * custom properties over the site tokens, so the dark theme follows.
 */
const ACCENT: Record<ProductModule, string> = {
  frotas:
    "[--acc:rgb(var(--site-violet))] [--acc-soft:var(--site-violet-soft)] [--acc-glow:var(--site-glow-a)] [--acc-dark-glow:rgba(155,125,255,.18)] [--other:rgb(var(--site-pink))] [--other-soft:var(--site-pink-soft)]",
  entregas:
    "[--acc:rgb(var(--site-pink))] [--acc-soft:var(--site-pink-soft)] [--acc-glow:var(--site-glow-b)] [--acc-dark-glow:rgba(240,85,142,.16)] [--other:rgb(var(--site-violet))] [--other-soft:var(--site-violet-soft)]",
};

/** Metadata of a product page (canonical, Open Graph, keywords). */
function productMetadata(module: ProductModule): Metadata {
  const { page } = PRODUCTS[module];

  return buildPageMetadata({
    path: page.path,
    title: page.title,
    socialTitle: page.socialTitle,
    description: page.description,
    keywords: [...page.keywords],
  });
}

const ProductPage = ({ module }: { module: ProductModule }): JSX.Element => {
  const product = PRODUCTS[module];

  return (
    <>
      <JsonLd value={productPageJsonLd(product.seo)} />
      <SiteShell className={cn("overflow-x-clip", ACCENT[module])}>
        <main>
          <ProductHero product={product} />
          <ProductFlow module={module} />
          <ProductFeatures product={product} />
          <ProductApp module={module} />
          <ProductDemo module={module} />
          <ProductFaq module={module} />
          <OtherModule product={product} />
          <ProductCta product={product} />
        </main>
      </SiteShell>
    </>
  );
};

export { ProductPage, productMetadata };
