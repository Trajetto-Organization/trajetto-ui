import { Metadata } from "next";

import { buildPageMetadata } from "@/lib/page-metadata";

import { SiteShell } from "@/components/site/site-shell";

import { QuoteForm } from "@/components/quote-form";

export const metadata: Metadata = buildPageMetadata({
  path: "/orcamento",
  title: "Solicitar orçamento",
  socialTitle: "Solicite um orçamento do Trajetto",
  description:
    "Peça um orçamento do Trajetto para a sua frota e a sua operação de entregas. Sem compromisso: a equipe responde por e-mail.",
  keywords: [
    "orçamento Trajetto",
    "preço gestão de frotas",
    "preço gestão de entregas",
  ],
});

const Quote = (): JSX.Element => (
  <SiteShell>
    <main>
      <QuoteForm />
    </main>
  </SiteShell>
);

export default Quote;
