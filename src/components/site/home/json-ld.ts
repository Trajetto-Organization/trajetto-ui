import { absoluteUrl, siteConfig } from "@/lib/site";

/**
 * Who publishes the site and what it is, for search engines. `sameAs` ties
 * the brand's social profiles (the ones the footer links) to this
 * Organization, so a crawler reads them as the company's own accounts.
 */
export function homeJsonLd(): Record<string, unknown> {
  const home = absoluteUrl("/");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${home}#organization`,
        name: siteConfig.name,
        legalName: siteConfig.legalName,
        url: home,
        email: siteConfig.email,
        logo: absoluteUrl("/favicon-512.png"),
        sameAs: siteConfig.socialProfiles.map((profile) => profile.href),
      },
      {
        "@type": "WebSite",
        "@id": `${home}#website`,
        name: siteConfig.name,
        url: home,
        inLanguage: siteConfig.locale,
        publisher: { "@id": `${home}#organization` },
      },
    ],
  };
}
