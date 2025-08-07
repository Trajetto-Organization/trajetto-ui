import { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

import { Navbar } from "@/components/layouts/navbar";
import { Footer } from "@/components/layouts/footer";

import { Step } from "@/components/step";
import { Map } from "@/components/contact-form/map";

import { WhatsApp } from "@/components/home/whatsapp";

export const metadata: Metadata = {
  title: "Contato",
  description: `
    Entre em contato com a equipe Trajetto para soluções personalizadas em gestão de frotas 
    e otimização logística. Solicite uma demonstração gratuita ou tire suas dúvidas com nossos especialistas.
  `.trim(),
  keywords: [
    "contato trajetto",
    "falar com trajetto",
    "suporte trajetto",
    "demonstração gratuita",
    "consultoria frotas",
    "atendimento ao cliente",
    "especialistas frotas",
    "orçamento personalizado",
    "tire suas dúvidas",
    "agendar reunião",
  ],

  // Canonical URL
  alternates: {
    canonical: `${process.env.METADATA_BASE}/contact`,
  },

  // Open Graph
  openGraph: {
    title: "Contato | Trajetto - Entre em Contato Conosco",
    description: `
      Fale com nossos especialistas em gestão de frotas. Solicite uma demonstração gratuita 
      e descubra como otimizar sua operação logística.
    `.trim(),
    url: `${process.env.METADATA_BASE}/contact`,
    type: "website",
    images: [
      {
        url: `${process.env.METADATA_BASE}/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: "Entre em contato com a Trajetto",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Contato | Trajetto - Entre em Contato Conoscos",
    description: `
      Fale com nossos especialistas em gestão de frotas. Demonstração gratuita disponível.
    `.trim(),
    images: [`${process.env.METADATA_BASE}/og-default.jpg`],
  },

  robots: {
    follow: true,
    index: true,
  },
};

const Contact = (): JSX.Element => {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <div className="pt-14">
          <ContactForm />
        </div>

        <div
          className="w-full flex flex-row 
          justify-center h-24 "
        >
          <Step />
        </div>

        <div className="mt-16 mb-24">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Onde Estamos</h2>
              <p className="text-muted-foreground mt-2">
                Visite nossa sede ou entre em contato online
              </p>
            </div>

            <Map />
          </div>
        </div>
      </main>
      <Footer />
      <WhatsApp />
    </>
  );
};

export default Contact;
