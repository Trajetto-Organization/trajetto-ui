import { absoluteUrl, siteConfig } from "@/lib/site";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ProductPageSeo {
  /** Root-relative path of the page, e.g. "/gestao-de-entregas". */
  path: string;
  /** Product name as the breadcrumb and the software node show it. */
  name: string;
  description: string;
  /** schema.org applicationSubCategory. */
  category: string;
  features: readonly string[];
  faq: readonly FaqItem[];
}

/**
 * Structured data of a product page: the page, the software it presents,
 * where it sits in the site and its questions — one graph, every node on
 * the canonical origin. No price or rating: none is published, and making
 * one up would be the kind of claim the site does not make.
 */
export function productPageJsonLd(
  page: ProductPageSeo,
): Record<string, unknown> {
  const url = absoluteUrl(page.path);
  const home = absoluteUrl("/");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: `${page.name} | ${siteConfig.name}`,
        description: page.description,
        inLanguage: siteConfig.locale,
        isPartOf: { "@type": "WebSite", name: siteConfig.name, url: home },
        about: { "@id": `${url}#software` },
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}#software`,
        name: `${siteConfig.name} · ${page.name}`,
        url,
        description: page.description,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: page.category,
        operatingSystem: "Web, Android",
        inLanguage: siteConfig.locale,
        featureList: page.features,
        publisher: {
          "@type": "Organization",
          name: siteConfig.name,
          url: home,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: home },
          { "@type": "ListItem", position: 2, name: page.name, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: page.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}
