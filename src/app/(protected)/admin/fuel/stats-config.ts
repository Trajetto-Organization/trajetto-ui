"use client";

import {
  FileText,
  Fuel as FuelIcon,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

/**
 * Statistics configuration for the supply page
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove, or modify stats here.
 */
const fuelStats: StatConfig[] = [
  {
    key: "total-refuelings",
    title: "Total de Abastecimentos",
    valueKey: "totalRefuelings",
    description: "Cadastrados no sistema",
    icon: FileText,
    variant: "primary",
  },
  {
    key: "total-liters",
    title: "Total de Litros",
    valueKey: "totalLiters",
    icon: FuelIcon,
    variant: "primary",
    description: "Litros abastecidos",
  },
  {
    key: "total-amount",
    title: "Valor Total",
    valueKey: "totalAmount",
    icon: DollarSign,
    variant: "warning",
    description: "Gasto total",
  },
  {
    key: "verified-odometer",
    title: "Odômetro Verificado",
    valueKey: "verifiedOdometer",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalRefuelings || 0;
      const verified = data.verifiedOdometer || 0;

      return total > 0
        ? `${verified} (${Math.round((verified / total) * 100)}%)`
        : "0";
    },
    description: "Com odômetro verificado",
  },
];

export { fuelStats };
