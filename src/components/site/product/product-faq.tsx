"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { DocumentLink } from "@/components/shared/document-link";
import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

import { PRODUCTS, type ProductModule } from "./content";

/**
 * Questions of the module as an accordion (one open at a time, the first
 * open on arrival). Answers stay in the HTML when closed, for search engines
 * and for the FAQPage structured data, which must match what the page shows.
 */
const ProductFaq = ({ module }: { module: ProductModule }): JSX.Element => {
  const items = PRODUCTS[module].faq;
  const [open, setOpen] = useState(0);

  return (
    <section
      aria-labelledby="faq-titulo"
      className="px-[clamp(20px,4vw,40px)] pb-[clamp(40px,6vw,72px)] pt-[clamp(80px,11vw,140px)]"
    >
      <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-x-[clamp(40px,6vw,88px)] gap-y-10">
        <Reveal>
          <Eyebrow className="mb-4">PERGUNTAS FREQUENTES</Eyebrow>
          <SectionHeading
            id="faq-titulo"
            className="text-[clamp(34px,4.2vw,54px)] leading-[1.02]"
          >
            O que costumam perguntar.
          </SectionHeading>
          <p className="mb-0 mt-[18px] max-w-[380px] text-base leading-[1.6] text-site-muted">
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

        <Reveal delay={100} className="border-t border-site-line">
          {items.map((item, index) => {
            const isOpen = open === index;
            const panelId = `faq-resposta-${index}`;
            const buttonId = `faq-pergunta-${index}`;

            return (
              <div key={item.question} className="border-b border-site-line">
                <h3 className="m-0">
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? -1 : index)}
                    className="group flex w-full items-center justify-between gap-5 rounded-sm bg-transparent py-[22px] text-left text-[17px] font-semibold leading-[1.4] outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40"
                  >
                    <span>{item.question}</span>
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full border border-site-line2",
                        "transition-[transform,background-color,color] [transition-duration:450ms] ease-site",
                        isOpen
                          ? "rotate-45 bg-site-ink text-site-bg"
                          : "bg-transparent text-site-ink group-hover:bg-site-surface",
                      )}
                    >
                      <Plus className="size-4" />
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  aria-hidden={!isOpen}
                  className={cn(
                    "grid transition-[grid-template-rows] duration-500 ease-site",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p
                      className={cn(
                        "m-0 pb-6 pr-12 text-[15.5px] leading-[1.65] text-site-muted transition-opacity [transition-duration:400ms] [text-wrap:pretty] max-[480px]:pr-0",
                        isOpen ? "opacity-100" : "opacity-0",
                      )}
                    >
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
};

export { ProductFaq };
