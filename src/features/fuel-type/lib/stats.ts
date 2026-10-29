import {
  UNKNOWN,
  formatCount,
  leaderDescription,
  unusedDescription,
  type CatalogStatCard,
} from "@/lib/catalog-stats";

import type { FuelTypeListSearchMeta } from "./types";

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "outubro" for "2026-10": the API's business month, read without a clock. */
function monthName(key: string): string {
  return MONTHS[Number(key.slice(5, 7)) - 1] ?? "mês";
}

const liters = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatLiters(value: number): string {
  return `${liters.format(value)} L`;
}

/**
 * Tipos de combustível (decision 16.350). With refuelings visible: how many
 * types, this month's refuelings (liters and money) and the fuel most
 * refueled with what a liter cost on average — the number a fleet manager
 * compares with the pump. Without them (no Gestão de Frotas, or a profile
 * that does not read Abastecimentos): the fleet's side, vehicles per fuel.
 * `pagerTotal` is undefined when the request failed.
 */
function fuelTypeStatCards(
  searchMeta: FuelTypeListSearchMeta | undefined,
  pagerTotal: number | undefined,
): CatalogStatCard[] {
  const total = searchMeta?.total ?? pagerTotal;

  const typesCard: CatalogStatCard = {
    key: "types",
    title: "Tipos de combustível",
    value: formatCount(total),
    description: searchMeta
      ? unusedDescription(searchMeta.total, searchMeta.withoutVehicles, {
          empty: "Nenhum combustível cadastrado",
          allUsed: "Todos em uso na frota",
          unusedSingular: "sem veículos cadastrados",
          unusedPlural: "sem veículos cadastrados",
        })
      : "Na busca atual",
    variant: "primary",
  };

  const month = searchMeta?.month;

  if (month) {
    const name = monthName(month.month);
    const leader = month.mostRefueled;

    return [
      typesCard,
      {
        key: "refuelings",
        title: `Abastecimentos em ${name}`,
        value: formatCount(month.refuelings),
        description:
          month.refuelings > 0
            ? `${formatLiters(month.liters)} · ${money.format(month.amount)}`
            : "Nenhum abastecimento neste mês",
        variant: "success",
      },
      {
        key: "most-refueled",
        title: `Mais abastecido em ${name}`,
        value: leader?.label ?? UNKNOWN,
        description: leader
          ? `${formatLiters(leader.liters)} · ${money.format(leader.averagePricePerLiter)}/L em média`
          : "Sem abastecimentos para comparar",
        variant: "warning",
      },
    ];
  }

  return [
    typesCard,
    {
      key: "vehicles",
      title: "Veículos cadastrados",
      value: formatCount(searchMeta?.vehicles),
      description: "Com um destes combustíveis",
      variant: "success",
    },
    {
      key: "most-used",
      title: "Mais usado na frota",
      value: searchMeta?.mostUsed?.label ?? UNKNOWN,
      description: !searchMeta
        ? "O combustível com mais veículos"
        : searchMeta.mostUsed
          ? leaderDescription(searchMeta.mostUsed, searchMeta.vehicles, {
              singular: "veículo",
              plural: "veículos",
            })
          : "Nenhum veículo com estes combustíveis",
      variant: "default",
    },
  ];
}

export { fuelTypeStatCards, monthName };
