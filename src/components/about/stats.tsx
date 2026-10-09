import { CountUp, Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

/**
 * Sobre · O que o Trajetto entrega: four figures between two rules. The
 * numbers count up when they scroll in; the server HTML has the final value.
 */

const STATS = [
  {
    value: 2,
    suffix: "",
    label: "Módulos",
    desc: "Gestão de Frotas e Gestão de Entregas, juntos ou separados",
  },
  {
    value: 20,
    suffix: "+",
    label: "Telas de gestão",
    desc: "Veículos, rotas, torre de controle, multas, contas a pagar e mais",
  },
  {
    value: 100,
    suffix: "%",
    label: "Isolamento por Empresa",
    desc: "Cada empresa enxerga apenas os próprios dados",
  },
  {
    value: 7,
    suffix: " dias",
    label: "Sem sinal",
    desc: "O app do motorista trabalha offline com os dados guardados",
  },
];

/*
 * Dividers per layout: one column (stacked, top rules), two columns (a cross)
 * and four (left rules), so no cell carries a stray line when the row wraps.
 */
const DIVIDERS = [
  "",
  "border-t min-[440px]:border-t-0 min-[440px]:border-l",
  "border-t min-[880px]:border-t-0 min-[880px]:border-l",
  "border-t min-[440px]:border-l min-[880px]:border-t-0",
];

const AboutStats = (): JSX.Element => (
  <section
    aria-label="O que o Trajetto entrega"
    className="px-[clamp(20px,4vw,40px)] pb-[clamp(40px,6vw,64px)]"
  >
    <dl className="mx-auto m-0 grid max-w-[1200px] grid-cols-1 border-y border-site-line min-[440px]:grid-cols-2 min-[880px]:grid-cols-4">
      {STATS.map((stat, index) => (
        <Reveal
          key={stat.label}
          delay={index * 80}
          className={cn(
            "flex flex-col gap-1.5 border-site-line px-6 py-[30px]",
            DIVIDERS[index],
          )}
        >
          <dt className="whitespace-nowrap font-site-display text-[clamp(44px,4.6vw,60px)] font-medium leading-none tracking-[-.04em]">
            <CountUp value={stat.value} />
            {stat.suffix ? (
              <span className="text-[.5em] tracking-[-.01em] text-site-muted">
                {stat.suffix}
              </span>
            ) : null}
          </dt>
          <dd className="m-0 mt-2.5 text-[15px] font-semibold">{stat.label}</dd>
          <dd className="m-0 max-w-[250px] text-sm text-site-muted">
            {stat.desc}
          </dd>
        </Reveal>
      ))}
    </dl>
  </section>
);

export { AboutStats };
