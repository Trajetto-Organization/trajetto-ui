"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Check, Package, Truck } from "lucide-react";

import { ArrowLink } from "@/components/site/arrow-link";
import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

/**
 * "Monte sua operação": two switches, one per module, and what comes with
 * the choice. At least one module stays on (turning off the last one
 * shakes its card instead). The summary card names the operation chosen.
 */

type ModuleKey = "frotas" | "entregas";

const FLEET_ITEMS = [
  "Abastecimentos com foto do odômetro e leitura por IA",
  "Checklist veicular com foto em cada item",
  "Ordens de serviço, peças e fornecedores",
  "Multas vinculadas ao veículo e ao motorista",
  "Contas a pagar da operação",
  "Kanban de tarefas da equipe",
];

const DELIVERY_ITEMS = [
  "Importação de NF-e (XML) sem duplicar e de planilha, as duas com estorno",
  "Rotas com a ordem de paradas definida pelo despachante",
  "Torre de controle com a posição do motorista em rota, com o app aberto",
  "Comprovante com foto, assinatura, recebedor e GPS",
  "Link de acompanhamento para o destinatário",
  "API e webhooks assinados para integrar ao seu sistema",
];

const SHARED = [
  "App Android do motorista",
  "Várias filiais na mesma conta",
  "Perfis de acesso por tela",
  "Exportação em CSV e Excel",
  "Tutorial guiado nas telas do painel",
];

const MODULES = {
  frotas: {
    title: "Gestão de Frotas",
    text: "Veículos, custos e manutenção sob controle, com o motorista registrando do celular.",
    Icon: Truck,
    on: "border-site-violet bg-site-violet-soft",
    track: "bg-site-violet",
    icon: "bg-site-violet-soft text-site-violet",
  },
  entregas: {
    title: "Gestão de Entregas",
    text: "Do pedido ao comprovante, com a operação do dia à vista da torre de controle.",
    Icon: Package,
    on: "border-site-pink bg-site-pink-soft",
    track: "bg-site-pink",
    icon: "bg-site-pink-soft text-site-pink",
  },
} as const;

/** Height-animated block (grid rows 0fr → 1fr); hidden from assistive tech when closed (it holds no controls). */
const Collapse = ({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) => (
  <div
    aria-hidden={!open}
    className={cn(
      "grid transition-[grid-template-rows,opacity] [transition-duration:550ms,400ms] ease-site motion-reduce:transition-none",
      open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
    )}
  >
    <div className="min-h-0 overflow-hidden">{children}</div>
  </div>
);

const ItemList = ({
  items,
  tone,
}: {
  items: string[];
  tone: "violet" | "pink";
}) => (
  <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-5 gap-y-0.5 p-0">
    {items.map((item) => (
      <li
        key={item}
        className="flex gap-2.5 border-t border-site-line py-2 text-sm leading-[1.45]"
      >
        <Check
          aria-hidden
          strokeWidth={2.4}
          className={cn(
            "mt-0.5 size-4 shrink-0",
            tone === "violet" ? "text-site-violet" : "text-site-pink",
          )}
        />
        {item}
      </li>
    ))}
  </ul>
);

const HomeModules = (): JSX.Element => {
  const [mods, setMods] = useState<Record<ModuleKey, boolean>>({
    frotas: true,
    entregas: true,
  });
  const [shake, setShake] = useState<ModuleKey | null>(null);
  const shakeTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(shakeTimer.current), []);

  const toggle = (key: ModuleKey) => {
    const next = { ...mods, [key]: !mods[key] };

    // An operation needs at least one module: refuse with a shake.
    if (!next.frotas && !next.entregas) {
      setShake(key);
      window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setShake(null), 480);
      return;
    }
    setMods(next);
  };

  const label =
    mods.frotas && mods.entregas
      ? "Frotas + Entregas"
      : mods.frotas
        ? "Gestão de Frotas"
        : "Gestão de Entregas";

  return (
    <section
      id="modulos"
      aria-labelledby="modulos-titulo"
      className="scroll-mt-20 px-[clamp(20px,4vw,40px)] py-[clamp(72px,10vw,128px)]"
    >
      <div className="mx-auto max-w-[1200px]">
        <Reveal className="mb-[clamp(36px,5vw,56px)] flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <div className="max-w-[640px]">
            <Eyebrow className="mb-4">MONTE SUA OPERAÇÃO</Eyebrow>
            <SectionHeading id="modulos-titulo">
              Contrate um módulo. Ou os dois.
            </SectionHeading>
          </div>
          <p className="m-0 max-w-[420px] text-[17px] leading-[1.6] text-site-muted [text-wrap:pretty]">
            Os dois módulos usam os mesmos motoristas, veículos e app. Comece
            pelo que resolve o seu problema hoje e ative o outro quando fizer
            sentido.
          </p>
        </Reveal>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-5">
          <Reveal className="flex flex-col gap-3.5">
            {(Object.keys(MODULES) as ModuleKey[]).map((key) => {
              const mod = MODULES[key];
              const on = mods[key];

              return (
                <button
                  key={key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => toggle(key)}
                  className={cn(
                    "flex gap-[clamp(14px,4vw,18px)] rounded-[22px] border-[1.5px] p-[clamp(18px,5.5vw,24px)] text-left outline-none",
                    "transition-[border-color,background-color,transform] [transition-duration:350ms,350ms,200ms] ease-[ease]",
                    "hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-site-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-site-bg motion-reduce:hover:translate-y-0",
                    on ? mod.on : "border-site-line bg-site-surface",
                    shake === key && "animate-tp-shake",
                  )}
                >
                  {/* Below 380px the icon gives its room to the text. */}
                  <span
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-[14px] max-[379px]:hidden",
                      mod.icon,
                    )}
                  >
                    <mod.Icon aria-hidden className="size-[22px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-site-display text-[clamp(21px,5.6vw,24px)] font-medium leading-[1.4] tracking-[-.02em]">
                      {mod.title}
                    </span>
                    <span className="mt-1.5 block text-[15px] leading-[1.55] text-site-muted">
                      {mod.text}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "relative h-7 w-[46px] shrink-0 rounded-full transition-colors [transition-duration:350ms]",
                      on ? mod.track : "bg-site-line2",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-[3px] top-[3px] size-[22px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.2)] dark:bg-white transition-transform [transition-duration:350ms] ease-site",
                        on && "translate-x-[18px]",
                      )}
                    />
                  </span>
                </button>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-site-ink px-6 py-[22px] text-site-bg">
              <div>
                <p className="m-0 font-site-mono text-[11px] font-medium tracking-[.14em] opacity-70">
                  SUA OPERAÇÃO
                </p>
                <p
                  aria-live="polite"
                  className="m-0 mt-1 font-site-display text-[22px] font-medium tracking-[-.02em]"
                >
                  {label}
                </p>
              </div>
              <ArrowLink
                href="/orcamento"
                size="md"
                arrowSize={16}
                className="min-h-[44px] rounded-xl bg-site-bg py-3 text-[14.5px] text-site-ink !shadow-none hover:-translate-y-px focus-visible:ring-site-bg/60 focus-visible:ring-offset-site-ink"
              >
                Solicitar orçamento
              </ArrowLink>
            </div>
          </Reveal>

          <Reveal
            delay={120}
            className="rounded-[26px] border border-site-line bg-site-surface p-[clamp(22px,3vw,32px)]"
          >
            <p className="m-0 text-[13px] font-semibold text-site-muted">
              O que vem junto
            </p>
            <Collapse open={mods.frotas}>
              <p className="mb-2.5 mt-5 flex items-center gap-2 text-sm font-semibold">
                <span
                  aria-hidden
                  className="size-2 rounded-[2px] bg-site-violet"
                />
                Frotas
              </p>
              <ItemList items={FLEET_ITEMS} tone="violet" />
            </Collapse>
            <Collapse open={mods.entregas}>
              <p className="mb-2.5 mt-5 flex items-center gap-2 text-sm font-semibold">
                <span
                  aria-hidden
                  className="size-2 rounded-full bg-site-pink"
                />
                Entregas
              </p>
              <ItemList items={DELIVERY_ITEMS} tone="pink" />
            </Collapse>
            <Collapse open={mods.frotas && mods.entregas}>
              <div className="mt-5 flex items-center gap-3 rounded-[14px] bg-site-soft px-4 py-3.5">
                <span aria-hidden className="flex shrink-0 gap-[3px]">
                  <span className="size-2 rounded-[2px] bg-site-violet" />
                  <span className="size-2 rounded-full bg-site-pink" />
                </span>
                <p className="m-0 text-[13.5px] leading-[1.5]">
                  Juntos, o status do veículo passa a{" "}
                  <strong className="font-semibold">em rota</strong> pela
                  própria operação de entregas.
                </p>
              </div>
            </Collapse>
            <p className="mb-2.5 mt-6 text-[13px] font-semibold text-site-muted">
              Incluso em qualquer módulo
            </p>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {SHARED.map((item) => (
                <li
                  key={item}
                  className="whitespace-nowrap rounded-full border border-site-line2 px-3 py-[7px] text-[13px]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export { HomeModules };
