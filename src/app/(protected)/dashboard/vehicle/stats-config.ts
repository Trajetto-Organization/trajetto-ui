"use client";

import { Car, CheckCircle2, XCircle, Navigation } from "lucide-react";
import { StatConfig } from "../../_components/stats/page-stats";

/**
 * Statistics setup for vehicle page
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove, or modify stats here.
 */
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
    calculateValue: (data) => {
      const total = data.totalVehicles || 0;
      const active = data.activeVehicles || 0;

      return total > 0
        ? `${active} (${Math.round((active / total) * 100)}%)`
        : "0";
    },
    description: "Em operação",
  },
  {
    key: "in-route",
    title: "Em Rota",
    valueKey: "inRoute",
    icon: Navigation,
    variant: "primary",
    calculateValue: (data) => {
      const total = data.totalVehicles || 0;
      const inRoute = data.inRoute || 0;

      return total > 0
        ? `${inRoute} (${Math.round((inRoute / total) * 100)}%)`
        : "0";
    },
    description: "Em deslocamento",
  },
  {
    key: "out-of-operation",
    title: "Fora de Operação",
    valueKey: "outOfOperation",
    icon: XCircle,
    variant: "danger",
    calculateValue: (data) => {
      const total = data.totalVehicles || 0;
      const outOfOperation = data.outOfOperation || 0;

      return total > 0
        ? `${outOfOperation} (${Math.round((outOfOperation / total) * 100)}%)`
        : "0";
    },
    description: "Inativos e bloqueados",
  },
];

export { vehicleStats };
