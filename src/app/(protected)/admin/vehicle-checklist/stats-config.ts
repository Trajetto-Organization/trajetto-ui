"use client";

import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { StatConfig } from "../../_components/stats/dto";

/**
 * Configuring statistics for the vehicle checklist page
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove, or modify stats here.
 */
const vehicleChecklistStats: StatConfig[] = [
  {
    key: "total-checklists",
    title: "Total de Checklists",
    valueKey: "totalChecklists",
    description: "Inspeções realizadas",
    icon: ClipboardList,
    variant: "primary",
  },
  {
    key: "good-condition",
    title: "Condição Boa",
    valueKey: "goodCondition",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalChecklists || 0;
      const good = data.goodCondition || 0;

      return total > 0 ? `${good} (${Math.round((good / total) * 100)}%)` : "0";
    },
    description: "Veículos aprovados",
  },
  {
    key: "regular-condition",
    title: "Condição Regular",
    valueKey: "regularCondition",
    icon: AlertTriangle,
    variant: "warning",
    calculateValue: (data) => {
      const total = data.totalChecklists || 0;
      const regular = data.regularCondition || 0;

      return total > 0
        ? `${regular} (${Math.round((regular / total) * 100)}%)`
        : "0";
    },
    description: "Atenção necessária",
  },
  {
    key: "bad-condition",
    title: "Condição Ruim",
    valueKey: "badCondition",
    icon: XCircle,
    variant: "danger",
    calculateValue: (data) => {
      const total = data.totalChecklists || 0;
      const bad = data.badCondition || 0;

      return total > 0 ? `${bad} (${Math.round((bad / total) * 100)}%)` : "0";
    },
    description: "Veículos reprovados",
  },
];

export { vehicleChecklistStats };
