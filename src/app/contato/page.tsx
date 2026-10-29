import { Metadata } from "next";

import { buildPageMetadata } from "@/lib/page-metadata";
import { ContactForm } from "@/components/contact-form";
import { Map } from "@/components/contact-form/map";

import { SiteShell } from "@/components/site/site-shell";

export const metadata: Metadata = buildPageMetadata({
  path: "/contato",
  title: "Contato",
  socialTitle: "Fale com o Trajetto",
  description:
    "Fale com a equipe do Trajetto: tire dúvidas sobre gestão de frotas e de entregas, peça uma demonstração ou converse sobre a sua operação.",
  keywords: ["contato Trajetto", "demonstração Trajetto", "suporte Trajetto"],
});

const Contact = (): JSX.Element => (
  <SiteShell>
    <main>
      <ContactForm />
      <Map />
    </main>
  </SiteShell>
);

export default Contact;
