import type { Metadata } from "next";

import {
  AppClosingCta,
  AppFeatures,
  AppHero,
  AppOffline,
  AppQuestions,
  AppStory,
  driverAppJsonLd,
} from "@/components/site/app-page";
import { SiteShell } from "@/components/site/site-shell";
import { JsonLd } from "@/components/seo/json-ld";

import { buildPageMetadata } from "@/lib/page-metadata";

const DESCRIPTION =
  "O aplicativo Android do Trajetto para o motorista: rota do dia, comprovante de entrega com foto e assinatura, abastecimento, checklist e envio sem sinal.";

export const metadata: Metadata = buildPageMetadata({
  path: "/app-do-motorista",
  title: "App do motorista",
  socialTitle:
    "App do motorista Trajetto: entregas, comprovante e abastecimento no Android",
  description: DESCRIPTION,
  keywords: [
    "app do motorista",
    "aplicativo de entregas",
    "comprovante de entrega digital",
    "aplicativo offline para motorista",
    "checklist veicular no celular",
    "Trajetto",
  ],
});

/** The driver app page (design: Trajetto App). Prerendered, like every public page. */
const DriverAppPage = (): JSX.Element => (
  <SiteShell>
    <JsonLd value={driverAppJsonLd(DESCRIPTION)} />
    <main className="flex-1">
      <AppHero />
      <AppStory />
      <AppOffline />
      <AppFeatures />
      <AppQuestions />
      <AppClosingCta />
    </main>
  </SiteShell>
);

export default DriverAppPage;
