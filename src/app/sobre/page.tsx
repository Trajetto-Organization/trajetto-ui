import { Metadata } from "next";

import { buildPageMetadata } from "@/lib/page-metadata";

import { SiteShell } from "@/components/site/site-shell";

import { AboutCta } from "@/components/about/cta";
import { AboutDifferentiators } from "@/components/about/differentiators";
import { AboutHero } from "@/components/about/hero";
import { AboutManifesto } from "@/components/about/manifesto";
import { AboutStats } from "@/components/about/stats";
import { AboutTeam } from "@/components/about/team-section";
import { AboutTimeline } from "@/components/about/timeline";
import { AboutValues } from "@/components/about/values";

export const metadata: Metadata = buildPageMetadata({
  path: "/sobre",
  title: "Sobre nós",
  socialTitle: "Sobre o Trajetto: quem faz a plataforma",
  description:
    "Conheça a equipe e a história do Trajetto, plataforma brasileira de gestão de frotas e de entregas criada em 2024 para transportadoras e frotistas.",
  keywords: ["sobre o Trajetto", "equipe Trajetto", "história do Trajetto"],
});

const About = (): JSX.Element => (
  <SiteShell>
    <main>
      <AboutHero />
      <AboutManifesto />
      <AboutValues />
      <AboutStats />
      <AboutTimeline />
      <AboutDifferentiators />
      <AboutTeam />
      <AboutCta />
    </main>
  </SiteShell>
);

export default About;
