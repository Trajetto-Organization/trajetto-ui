import type { Metadata } from "next";

import { SiteShell } from "@/components/site/site-shell";

import {
  HomeAI,
  HomeCta,
  HomeDriverApp,
  HomeHero,
  HomeModules,
  HomePanel,
  HomeStats,
} from "@/components/site/home";
import { JsonLd } from "@/components/seo/json-ld";

import { buildPageMetadata } from "@/lib/page-metadata";
import { absoluteUrl, siteConfig } from "@/lib/site";

const HOME_TITLE = `${siteConfig.name} | ${siteConfig.tagline}`;

// The home page owns its canonical and og:url; the layout hands neither down.
// The title is absolute because it already carries the brand.
export const metadata: Metadata = {
  ...buildPageMetadata({
    path: "/",
    title: HOME_TITLE,
    socialTitle: HOME_TITLE,
    description: siteConfig.description,
  }),
  title: { absolute: HOME_TITLE },
};

/** Who publishes the site and what it is, for search engines. */
function homeJsonLd(): Record<string, unknown> {
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

/**
 * The landing page (design: Trajetto Home, hero "camadas"): the statement
 * and the product in layers, the facts, the two modules to combine, the
 * driver app, the AI, the web panel and the closing call. The depth lives
 * on /gestao-de-frotas, /gestao-de-entregas and /app-do-motorista.
 */
const Home = (): JSX.Element => {
  return (
    <>
      <JsonLd value={homeJsonLd()} />
      <SiteShell>
        {/* One landmark for the whole page: every section is main content. */}
        <main>
          <HomeHero />
          <HomeStats />
          <HomeModules />
          <HomeDriverApp />
          <HomeAI />
          <HomePanel />
          <HomeCta />
        </main>
      </SiteShell>
    </>
  );
};

export default Home;
