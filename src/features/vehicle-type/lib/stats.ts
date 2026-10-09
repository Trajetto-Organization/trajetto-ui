import {
  UNKNOWN,
  formatCount,
  leaderDescription,
  unusedDescription,
  type CatalogStatCard,
} from "@/lib/catalog-stats";

import type { VehicleTypeListSearchMeta } from "../types";

/**
 * Tipos de veículo: how many types (and how many no vehicle uses — the only
 * ones that can be deleted), how many vehicles have one, and the type most
 * of the fleet is (decision 16.350). `pagerTotal` is undefined when the
 * request failed.
 */
function vehicleTypeStatCards(
  searchMeta: VehicleTypeListSearchMeta | undefined,
  pagerTotal: number | undefined,
): CatalogStatCard[] {
  const total = searchMeta?.total ?? pagerTotal;

  return [
    {
      key: "types",
      title: "Tipos de veículo",
      value: formatCount(total),
      description: searchMeta
        ? unusedDescription(searchMeta.total, searchMeta.withoutVehicles, {
            empty: "Nenhum tipo cadastrado",
            allUsed: "Todos em uso na frota",
            unusedSingular: "sem veículos cadastrados",
            unusedPlural: "sem veículos cadastrados",
          })
        : "Na busca atual",
      variant: "primary",
    },
    {
      key: "vehicles",
      title: "Veículos com tipo",
      value: formatCount(searchMeta?.vehicles),
      description: "Cadastrados com um destes tipos",
      variant: "success",
    },
    {
      key: "most-used",
      title: "Tipo mais usado",
      value: searchMeta?.mostUsed?.label ?? UNKNOWN,
      description: !searchMeta
        ? "O tipo com mais veículos"
        : searchMeta.mostUsed
          ? leaderDescription(searchMeta.mostUsed, searchMeta.vehicles, {
              singular: "veículo",
              plural: "veículos",
            })
          : "Nenhum veículo com estes tipos",
      variant: "default",
    },
  ];
}

export { vehicleTypeStatCards };
