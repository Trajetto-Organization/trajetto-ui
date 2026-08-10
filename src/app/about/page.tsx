import { Metadata } from "next";

import { Navbar } from "@/components/layouts/navbar";
import { Footer } from "@/components/layouts/footer";

import { AboutHeroSection } from "@/components/about/about-hero-section";
import { AboutMissionSection } from "@/components/about/about-mission-section";

import { AboutTimelineSection } from "@/components/about/about-timeline-section";
import { AboutStatsSection } from "@/components/about/about-stats-section";

import { AboutTeamSection } from "@/components/about/about-team-section";

export const metadata: Metadata = {
  title: "Sobre Nós",
  description: `
    Desde 2024, a Trajetto transforma a gestão de frotas com tecnologia inovadora. 
    Conheça nossa história, equipe e valores que nos tornaram referência em soluções integradas 
    que reduzem custos e otimizam operações logísticas em 12 países.
  `.trim(),
  keywords: [
    "sobre trajetto",
    "empresa gestão frotas",
    "história trajetto",
    "equipe trajetto",
    "missão visão valores",
    "tecnologia frotas",
    "inovação logística",
    "liderança mercado",
    "transformação digital",
    "sustentabilidade frotas",
  ],

  // Canonical URL
  alternates: {
    canonical: `${process.env.METADATA_BASE}/about`,
  },

  // Open Graph
  openGraph: {
    title: "Sobre Nós | Trajetto - Gestão Inteligente de Frotas",
    description: `
      Conheça a Trajetto: líder em gestão inteligente de frotas. Nossa missão é transformar 
      operações logísticas com tecnologia inovadora e sustentável.
    `.trim(),
    url: `${process.env.METADATA_BASE}/about`,
    type: "website",
    images: [
      {
        url: `${process.env.METADATA_BASE}/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: "Equipe Trajetto - Especialistas em Gestão de Frotas",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Sobre Nós | Trajetto - Gestão Inteligente de Frotas",
    description: `
      Desde 2024 transformando operações logísticas com tecnologia inovadora. 
      Conheça nossa história e missão.
    `.trim(),
    images: [`${process.env.METADATA_BASE}/og-default.jpg`],
  },

  robots: {
    follow: true,
    index: true,
  },
};

const About = (): JSX.Element => {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-14">
        <AboutHeroSection />
        <AboutMissionSection />
        <AboutTimelineSection />
        <AboutStatsSection />
        <AboutTeamSection />
      </main>
      <Footer />
      {/* <WhatsApp /> */}
    </>
  );
};

export default About;
