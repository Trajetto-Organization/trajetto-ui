import { absoluteUrl, siteConfig } from "@/lib/site";

import { APP_FAQ, FEATURES } from "./content";

const PATH = "/app-do-motorista";
const NAME = "App do motorista";

/**
 * Structured data of the driver app page, in the same graph shape as the
 * product pages: the page, the Android app it presents, the breadcrumb and
 * the questions the page answers. No price, rating or download count: none
 * is published, so none is claimed.
 */
export function driverAppJsonLd(description: string): Record<string, unknown> {
  const url = absoluteUrl(PATH);
  const home = absoluteUrl("/");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: `${NAME} | ${siteConfig.name}`,
        description,
        inLanguage: siteConfig.locale,
        isPartOf: { "@type": "WebSite", name: siteConfig.name, url: home },
        about: { "@id": `${url}#software` },
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      {
        "@type": "MobileApplication",
        "@id": `${url}#software`,
        name: `${siteConfig.name} · ${NAME}`,
        url,
        description,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Aplicativo do motorista",
        operatingSystem: "Android",
        inLanguage: siteConfig.locale,
        featureList: FEATURES.map((feature) => feature.title),
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
          { "@type": "ListItem", position: 2, name: NAME, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: APP_FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}
