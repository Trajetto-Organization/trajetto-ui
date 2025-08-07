import { Metadata } from "next";

import { Navbar } from "@/components/layouts/navbar";
import { Footer } from "@/components/layouts/footer";

import { QuoteForm } from "@/components/quote-form";
import { WhatsApp } from "@/components/home/whatsapp";

export const metadata: Metadata = {
  title: "Orçamento Gratuito | Trajetto - Solicite Sua Cotação Personalizada",
  description: `
    Solicite um orçamento personalizado para sua empresa e descubra como o 
    Trajetto pode transformar a gestão da sua frota com economia, eficiência e controle total. 
    Demonstração gratuita incluída. Sem compromisso.
  `.trim(),
  keywords: [
    "orçamento trajetto",
    "cotação gestão frotas",
    "preço sistema frotas",
    "demonstração gratuita",
    "proposta comercial",
    "custo benefício",
    "investimento frotas",
    "ROI gestão frotas",
    "economia combustível",
    "redução custos operacionais",
    "planos trajetto",
    "contrato personalizado",
  ],

  // Canonical URL
  alternates: {
    canonical: `${process.env.METADATA_BASE}/quote`,
  },

  // Open Graph
  openGraph: {
    title: "Orçamento Gratuito | Trajetto - Solicite Sua Cotação",
    description: `
      Solicite orçamento personalizado para gestão da sua frota. Demonstração gratuita, 
      sem compromisso. Descubra quanto você pode economizar com o Trajetto.
    `.trim(),
    url: `${process.env.METADATA_BASE}/quote`,
    type: "website",
    images: [
      {
        url: `${process.env.METADATA_BASE}/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: "Solicite orçamento personalizado - Trajetto",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Orçamento Gratuito | Trajetto - Solicite Sua Cotação",
    description: `
      Orçamento personalizado para gestão de frotas. Demonstração gratuita, sem compromisso.
    `.trim(),
    images: [`${process.env.METADATA_BASE}/og-default.jpg`],
  },

  robots: {
    follow: true,
    index: true,
  },
};

const Quote = (): JSX.Element => {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-14">
        <QuoteForm />
      </main>
      <Footer />
      <WhatsApp />
    </>
  );
};

export default Quote;
