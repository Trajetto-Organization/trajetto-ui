import { Route, Truck } from "lucide-react";

import { cn } from "@/lib/utils";

import { CountUp, Reveal } from "./reveal";

/**
 * The web dashboard mockup (design: Trajetto Painel): today's delivery
 * tiles, progress per driver, fleet counters and weekly refuelling bars.
 * Numbers count up and bars grow when it scrolls into view (CountUp and
 * Reveal: the server HTML already shows the final state).
 *
 * Decorative illustration of the real dashboard, so it is one image to
 * assistive technology, with a description.
 */

const TILES = [
  {
    label: "Sem rota",
    hint: "Aguardando designação",
    value: 4,
    dot: "bg-[#94a3b8]",
  },
  {
    label: "Designadas",
    hint: "Com motorista, não iniciadas",
    value: 12,
    dot: "bg-[#8b5cf6]",
  },
  { label: "Em rota", hint: "Na rua agora", value: 18, dot: "bg-[#0ea5e9]" },
  {
    label: "Entregues hoje",
    hint: "Concluídas no dia",
    value: 46,
    dot: "bg-[#10b981]",
  },
  {
    label: "Insucessos hoje",
    hint: "Não entregues no dia",
    value: 2,
    dot: "bg-[#ef4444]",
  },
  {
    label: "Ocorrências hoje",
    hint: "Relatadas pelo motorista",
    value: 3,
    dot: "bg-[#f59e0b]",
  },
];

const DRIVERS = [
  { name: "Carlos Souza", done: 8, total: 12 },
  { name: "Ana Ribeiro", done: 11, total: 14 },
  { name: "João Lima", done: 4, total: 10 },
].map((driver) => {
  const pct = Math.round((driver.done / driver.total) * 100);

  return { ...driver, pct, label: `${driver.done}/${driver.total} · ${pct}%` };
});

const FLEET = [
  { label: "Veículos", value: 127 },
  { label: "Motoristas", value: 94 },
  { label: "Ordens de Serviço", value: 5 },
  { label: "Multas", value: 8 },
];

const WEEKS = [62, 70, 58, 74, 66, 80, 71, 77];
const WEEK_MAX = Math.max(...WEEKS);

const card = "min-w-0 rounded-[14px] border border-site-line bg-site-soft";

interface PanelMockupProps {
  className?: string;
}

const PanelMockup = ({ className }: PanelMockupProps): JSX.Element => (
  <div
    role="img"
    aria-label="Painel do Trajetto: entregas do dia por status, progresso por motorista, números da frota e abastecimentos por semana."
    className={cn(
      "relative rounded-[22px] border border-site-line bg-site-surface p-[clamp(14px,2vw,22px)] font-site text-site-ink shadow-site-panel",
      className,
    )}
  >
    <div className="flex items-center justify-between gap-3 border-b border-site-line pb-3.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full bg-site-line2" />
        <span className="size-2.5 shrink-0 rounded-full bg-site-line2" />
        <span className="size-2.5 shrink-0 rounded-full bg-site-line2" />
        <span className="ml-2 whitespace-nowrap text-[13px] font-semibold">
          Painel · Hoje
        </span>
      </div>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-site-muted">
        <span className="relative flex size-2">
          <span className="absolute inset-0 animate-tp-live rounded-full bg-[#10b981] opacity-60" />
          <span className="relative size-2 rounded-full bg-[#10b981]" />
        </span>
        Atualizado agora
      </span>
    </div>

    <div className="mt-[18px] flex flex-wrap gap-[18px]">
      <div className="flex min-w-0 flex-[3_1_340px] flex-col gap-3.5">
        <p className="m-0 flex items-center gap-2 text-[13px] font-semibold">
          <Route aria-hidden className="size-4 text-site-pink" />
          Operação de hoje
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
          {TILES.map((tile) => (
            <div key={tile.label} className={cn(card, "p-3")}>
              <div className="flex items-center justify-between gap-1.5">
                <span className="truncate text-[11.5px] text-site-muted">
                  {tile.label}
                </span>
                <span
                  className={cn("size-[7px] shrink-0 rounded-full", tile.dot)}
                />
              </div>
              <CountUp
                value={tile.value}
                className="mt-1 block font-site-display text-[26px] leading-[1.5] tracking-[-.02em] tabular-nums"
              />
              <p className="m-0 truncate text-[11px] text-site-muted">
                {tile.hint}
              </p>
            </div>
          ))}
        </div>
        <div className={cn(card, "px-3.5 py-3")}>
          <p className="m-0 text-xs leading-[18px] font-medium">
            Quadro por motorista
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {DRIVERS.map((driver, index) => (
              <div key={driver.name} className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-2 text-xs leading-[18px]">
                  <span>{driver.name}</span>
                  <span className="tabular-nums text-site-muted">
                    {driver.label}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-site-line">
                  <Reveal
                    variant="grow-x"
                    delay={250 + index * 70}
                    className="h-full rounded-full bg-[#10b981]"
                    style={{ width: `${driver.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-[2_1_240px] flex-col gap-3.5">
        <p className="m-0 flex items-center gap-2 text-[13px] font-semibold">
          <Truck aria-hidden className="size-4 text-site-violet" />
          Frota
        </p>
        <div className="grid grid-cols-2 gap-2">
          {FLEET.map((item) => (
            <div key={item.label} className={cn(card, "p-3")}>
              <span className="block truncate text-[11.5px] text-site-muted">
                {item.label}
              </span>
              <CountUp
                value={item.value}
                className="mt-0.5 block font-site-display text-[22px] leading-[1.5] tracking-[-.02em] tabular-nums"
              />
            </div>
          ))}
        </div>
        <div className={cn(card, "px-3.5 py-3")}>
          <div className="flex justify-between gap-2">
            <p className="m-0 text-xs leading-[18px] font-medium">
              Abastecimentos por semana
            </p>
            <span className="text-[11px] text-site-muted">8 semanas</span>
          </div>
          <div className="mt-3 flex h-24 items-end gap-1.5">
            {WEEKS.map((value, index) => (
              <Reveal
                key={index}
                variant="grow-y"
                delay={250 + index * 70}
                className="flex-1 rounded-[6px_6px_2px_2px] bg-site-violet"
                style={{
                  height: `${(value / WEEK_MAX) * 100}%`,
                  opacity: index === WEEKS.length - 1 ? 1 : 0.35 + index * 0.06,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export { PanelMockup };
export type { PanelMockupProps };
