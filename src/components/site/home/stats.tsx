import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

/** Four facts of the product, none of them a marketing figure. */
const STATS = [
  {
    value: "2",
    unit: "módulos",
    text: "Frotas e Entregas, contratados juntos ou separados",
  },
  {
    value: "7 dias",
    unit: "sem sinal",
    text: "O app do motorista trabalha offline com os dados guardados",
  },
  {
    value: "SHA-256",
    unit: null,
    text: "Cada comprovante em PDF leva sua impressão digital e um QR de conferência",
  },
  {
    value: "2FA",
    unit: "no login",
    text: "Verificação em duas etapas e perfis de acesso por tela",
  },
] as const;

/*
 * Rules between the cells, by layout: one column (phones) rules on top,
 * two columns rule the right column on the left and the second row on top,
 * four columns (the design) rule every cell but the first on the left.
 */
const CELL = [
  "min-[520px]:pr-6",
  "border-t min-[520px]:border-l min-[520px]:border-t-0 min-[520px]:pl-6 lg:pr-6",
  "border-t min-[520px]:pr-6 lg:border-l lg:border-t-0 lg:pl-6",
  "border-t min-[520px]:border-l min-[520px]:pl-6 lg:border-t-0",
];

const HomeStats = (): JSX.Element => (
  <section
    aria-label="O Trajetto em números"
    className="px-[clamp(20px,4vw,40px)] py-[clamp(40px,6vw,64px)]"
  >
    <dl className="mx-auto grid max-w-[1200px] grid-cols-1 border-y border-site-line min-[520px]:grid-cols-2 lg:grid-cols-4">
      {STATS.map((stat, index) => (
        <Reveal
          key={stat.value}
          delay={index * 80}
          className={cn(
            "flex flex-col gap-1.5 border-site-line py-7",
            CELL[index],
          )}
        >
          <dt className="font-site-display text-[clamp(40px,4.4vw,56px)] font-medium leading-none tracking-[-.04em]">
            {stat.value}
            {stat.unit ? (
              <>
                {" "}
                <span className="whitespace-nowrap text-[.42em] tracking-[-.01em] text-site-muted">
                  {stat.unit}
                </span>
              </>
            ) : null}
          </dt>
          <dd className="m-0 mt-2 max-w-[240px] text-sm text-site-muted">
            {stat.text}
          </dd>
        </Reveal>
      ))}
    </dl>
  </section>
);

export { HomeStats };
