import {
  Eye,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

/**
 * Sobre · Valores: a sticky heading beside a numbered list. On hover a row
 * slides 8px and its icon fills with the module colour and tilts (CSS only).
 */

const VALUES: {
  title: string;
  desc: string;
  icon: LucideIcon;
  module: "f" | "d";
}[] = [
  {
    title: "Inovação",
    desc: "IA para conferir fotos e um app que funciona sem sinal",
    icon: Sparkles,
    module: "f",
  },
  {
    title: "Confiabilidade",
    desc: "Registros que não se perdem nem se duplicam",
    icon: ShieldCheck,
    module: "d",
  },
  {
    title: "Colaboração",
    desc: "Parceria próxima com nossos clientes",
    icon: Users,
    module: "f",
  },
  {
    title: "Transparência",
    desc: "Só prometemos o que o produto faz",
    icon: Eye,
    module: "d",
  },
];

const SHIFT =
  "transition-transform duration-500 ease-site group-hover:translate-x-2 motion-reduce:group-hover:translate-x-0";

const AboutValues = (): JSX.Element => (
  <section
    aria-labelledby="valores-titulo"
    className="px-[clamp(20px,4vw,40px)] pb-[clamp(80px,10vw,128px)]"
  >
    <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-x-16 gap-y-10">
      <Reveal className="min-[760px]:sticky min-[760px]:top-[120px]">
        <Eyebrow className="mb-4">NOSSOS VALORES</Eyebrow>
        <SectionHeading
          id="valores-titulo"
          className="text-[clamp(34px,4.2vw,56px)] leading-[1.02]"
        >
          O que guia cada decisão de produto.
        </SectionHeading>
      </Reveal>
      <ol className="m-0 flex list-none flex-col p-0">
        {VALUES.map(({ title, desc, icon: Icon, module }, index) => (
          <Reveal
            as="li"
            key={title}
            delay={index * 80}
            className="group grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-5 border-t border-site-line px-2 py-[26px] max-[359px]:grid-cols-[36px_minmax(0,1fr)_auto] max-[359px]:gap-3"
          >
            <span className="font-site-mono text-[13px] text-site-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <h3
                className={cn(
                  "m-0 font-site-display text-[clamp(24px,2.4vw,30px)] font-medium tracking-[-.02em]",
                  SHIFT,
                )}
              >
                {title}
              </h3>
              <p
                className={cn(
                  "m-0 mt-1.5 text-[15.5px] leading-[1.55] text-site-muted [transition-delay:30ms]",
                  SHIFT,
                )}
              >
                {desc}
              </p>
            </div>
            <span
              aria-hidden
              className={cn(
                "flex size-12 items-center justify-center rounded-[14px] transition-[background-color,color,transform] duration-500 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)]",
                "group-hover:-rotate-[8deg] group-hover:scale-[1.06] group-hover:text-white motion-reduce:group-hover:rotate-0 motion-reduce:group-hover:scale-100",
                module === "d"
                  ? "bg-site-pink-soft text-site-pink group-hover:bg-site-pink"
                  : "bg-site-violet-soft text-site-violet group-hover:bg-site-violet",
              )}
            >
              <Icon className="size-[22px]" />
            </span>
          </Reveal>
        ))}
      </ol>
    </div>
  </section>
);

export { AboutValues };
