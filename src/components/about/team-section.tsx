import Image from "next/image";

import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { ScrollDrift } from "@/components/site/institutional/motion";

import { PARTNERS } from "./team";

/**
 * Sobre · Equipe: the partners in grayscale that turns to colour on hover
 * or focus, the even columns drifting against the scroll from 900px.
 */
const AboutTeam = (): JSX.Element => (
  <section
    aria-labelledby="equipe-titulo"
    className="px-[clamp(20px,4vw,40px)] pb-[clamp(60px,8vw,100px)] pt-[clamp(80px,11vw,140px)]"
  >
    <div className="mx-auto max-w-[1200px]">
      <Reveal className="mb-[clamp(40px,6vw,64px)] flex flex-wrap items-end justify-between gap-x-12 gap-y-5">
        <div>
          <Eyebrow className="mb-4">NOSSA EQUIPE</Eyebrow>
          <SectionHeading id="equipe-titulo">
            Conheça quem faz o Trajetto.
          </SectionHeading>
        </div>
        <p className="m-0 max-w-[380px] text-base leading-[1.6] text-site-muted">
          Quatro sócios com experiência em produto, engenharia, infraestrutura e
          vendas B2B.
        </p>
      </Reveal>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] gap-5">
        {PARTNERS.map((person, index) => (
          <ScrollDrift
            key={person.id}
            factor={index % 2 ? -0.06 : 0.02}
            className="min-w-0"
          >
            <Reveal as="article" delay={index * 90} className="group">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-site-soft2">
                <Image
                  src={person.photo}
                  alt={`${person.name} - ${person.role}`}
                  fill
                  placeholder="blur"
                  quality={85}
                  sizes="(max-width: 560px) 100vw, (max-width: 1100px) 50vw, 285px"
                  className="object-cover [filter:grayscale(.9)_contrast(1.04)] transition-[filter,transform] [transition-duration:600ms,900ms] ease-site group-hover:scale-105 group-hover:[filter:grayscale(0)] motion-reduce:group-hover:scale-100"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,8,12,.78),rgba(8,8,12,.1)_45%,transparent_70%)]"
                />
                <div className="absolute inset-x-[18px] bottom-4 text-white">
                  <h3 className="m-0 font-site-display text-[22px] font-medium tracking-[-.02em]">
                    {person.name}
                  </h3>
                  <p className="m-0 mt-0.5 text-[13px] text-white/90">
                    {person.role}
                  </p>
                </div>
              </div>
              <p className="mx-1 mb-0 mt-4 text-[14.5px] leading-[1.55] text-site-muted [text-wrap:pretty]">
                {person.bio}
              </p>
            </Reveal>
          </ScrollDrift>
        ))}
      </div>
    </div>
  </section>
);

export { AboutTeam };
