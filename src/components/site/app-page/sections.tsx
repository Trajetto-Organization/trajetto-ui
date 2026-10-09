import Image from "next/image";

import { ArrowLink } from "@/components/site/arrow-link";
import {
  Container,
  Eyebrow,
  SectionHeading,
} from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { DocumentLink } from "@/components/shared/document-link";

import trajettoLogo from "@/assets/logo/trajetto-logo.png";

import { APP_FAQ, FEATURES } from "./content";
import { AppFaq } from "./faq";
import { FeatureCard } from "./feature-card";

const ModuleChip = ({ module }: { module: "f" | "d" }) => (
  <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-site-line2 px-3.5 py-2 text-[13.5px] font-medium">
    <span
      aria-hidden
      className={
        module === "f"
          ? "size-2 rounded-[2px] bg-site-violet"
          : "size-2 rounded-full bg-site-pink"
      }
    />
    {module === "f" ? "Frotas" : "Entregas"}
  </span>
);

/** "Tudo o que o motorista registra": the eight things the app records. */
const AppFeatures = (): JSX.Element => (
  <section
    aria-labelledby="recursos-titulo"
    className="px-[clamp(20px,4vw,40px)] pb-[clamp(40px,6vw,72px)] pt-[clamp(80px,11vw,140px)]"
  >
    <Container>
      <Reveal className="mb-[clamp(36px,5vw,56px)] flex flex-wrap items-end justify-between gap-x-12 gap-y-5">
        <div className="max-w-[640px]">
          <Eyebrow className="mb-4">NO APP</Eyebrow>
          <SectionHeading id="recursos-titulo">
            Tudo o que o motorista registra.
          </SectionHeading>
        </div>
        <div className="flex gap-2">
          <ModuleChip module="f" />
          <ModuleChip module="d" />
        </div>
      </Reveal>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
        {FEATURES.map((feature, index) => (
          <FeatureCard
            key={feature.title}
            feature={feature}
            delay={(index % 4) * 60}
          />
        ))}
      </div>
    </Container>
  </section>
);

/** Frequently asked questions: heading on the left, accordion on the right. */
const AppQuestions = (): JSX.Element => (
  <section
    aria-labelledby="faq-titulo"
    className="px-[clamp(20px,4vw,40px)] pb-[clamp(40px,6vw,72px)] pt-[clamp(60px,8vw,100px)]"
  >
    <Container className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-x-[clamp(40px,6vw,88px)] gap-y-10">
      <Reveal>
        <Eyebrow className="mb-4">PERGUNTAS FREQUENTES</Eyebrow>
        <SectionHeading
          id="faq-titulo"
          className="text-[clamp(34px,4.2vw,54px)] leading-[1.02]"
        >
          O que costumam perguntar.
        </SectionHeading>
        <p className="m-0 mt-[18px] max-w-[380px] text-base leading-[1.6] text-site-muted">
          Não achou a sua dúvida?{" "}
          <DocumentLink
            href="/contato"
            className="rounded-sm font-semibold text-site-ink underline underline-offset-[3px] outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40"
          >
            Fale com a equipe
          </DocumentLink>
          .
        </p>
      </Reveal>
      <Reveal delay={100}>
        <AppFaq items={APP_FAQ} />
      </Reveal>
    </Container>
  </section>
);

/** The closing dark band with the big logo mark (dark in both themes). */
const AppClosingCta = (): JSX.Element => (
  <section
    aria-labelledby="cta-titulo"
    className="px-[clamp(12px,3vw,24px)] pb-[clamp(24px,4vw,40px)] pt-[clamp(40px,6vw,72px)]"
  >
    <Reveal className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[clamp(24px,3vw,36px)] bg-[#0e0e14] px-[clamp(24px,6vw,80px)] py-[clamp(48px,7vw,96px)] text-[#f5f5f7]">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(50%_80%_at_100%_100%,rgba(216,27,96,.22),transparent_70%),radial-gradient(40%_60%_at_85%_0%,rgba(106,63,224,.22),transparent_70%)]"
      />
      <Image
        src={trajettoLogo}
        alt=""
        aria-hidden
        sizes="(max-width: 900px) 70vw, 620px"
        className="pointer-events-none absolute right-[-8%] top-1/2 h-auto w-[min(620px,70%)] max-w-none -translate-y-1/2 opacity-90"
      />
      <div className="relative max-w-[620px]">
        <SectionHeading id="cta-titulo" size="xl">
          Coloque o app na mão dos seus motoristas.
        </SectionHeading>
        <p className="m-0 mt-[22px] max-w-[500px] text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-[#c4c5cf]">
          O app vem com o módulo que você contratar: Frotas, Entregas ou os
          dois.
        </p>
        <div className="mt-[34px] flex flex-wrap gap-3">
          <ArrowLink href="/orcamento" variant="light">
            Solicitar orçamento
          </ArrowLink>
          <ArrowLink
            href="/contato"
            variant="ghost-dark"
            arrow={false}
            className="px-5"
          >
            Falar com a equipe
          </ArrowLink>
        </div>
      </div>
    </Reveal>
  </section>
);

export { AppClosingCta, AppFeatures, AppQuestions };
