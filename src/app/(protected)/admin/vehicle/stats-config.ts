"use client";

import { Car, CheckCircle2, XCircle, Navigation } from "lucide-react";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

/**
 * Statistics setup for vehicle page
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove, or modify stats here.
 *
 * The three derived cards read a tally the API counts over the whole fleet.
 * When it is absent — an older API during a rolling deploy, or a failed
 * request — they show "—" rather than 0, because a confident zero beside a
 * non-zero total is a wrong number presented as a fact.
 */
const asShare = (value: number | undefined, total: number): string => {
  if (value === undefined) return "—";
  if (total <= 0) return "0";

  return `${value} (${Math.round((value / total) * 100)}%)`;
};
const vehicleStats: StatConfig[] = [
  {
    key: "total-vehicles",
    title: "Total de Veículos",
    valueKey: "totalVehicles",
    description: "Cadastrados no sistema",
    icon: Car,
    variant: "primary",
  },
  {
    key: "active-vehicles",
    title: "Veículos Ativos",
    valueKey: "activeVehicles",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) => asShare(data.activeVehicles, data.totalVehicles || 0),
    description: "Em operação",
  },
  {
    key: "in-route",
    title: "Em Rota",
    valueKey: "inRoute",
    icon: Navigation,
    variant: "primary",
    calculateValue: (data) => asShare(data.inRoute, data.totalVehicles || 0),
    description: "Em deslocamento",
  },
  {
    key: "out-of-operation",
    title: "Fora de Operação",
    valueKey: "outOfOperation",
    icon: XCircle,
    variant: "danger",
    calculateValue: (data) =>
      asShare(data.outOfOperation, data.totalVehicles || 0),
    description: "Inativos e bloqueados",
  },
];

export { vehicleStats };
