"use client";

import { Users, UserCheck, UserX, UserCog } from "lucide-react";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

/**
 * Statistics setup for drivers page
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove, or modify stats here.
 */
const driverStats: StatConfig[] = [
  {
    key: "total-drivers",
    title: "Total de Motoristas",
    valueKey: "totalDrivers",
    description: "Cadastrados no sistema",
    icon: Users,
    variant: "primary",
  },
  {
    key: "active-drivers",
    title: "Motoristas Ativos",
    valueKey: "activeDrivers",
    icon: UserCheck,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalDrivers || 0;
      const active = data.activeDrivers || 0;

      return total > 0
        ? `${active} (${Math.round((active / total) * 100)}%)`
        : "0";
    },
    description: "Com status ativo",
  },
  {
    key: "inactive-drivers",
    title: "Motoristas Inativos",
    valueKey: "inactiveDrivers",
    icon: UserX,
    variant: "danger",
    calculateValue: (data) => {
      const total = data.totalDrivers || 0;
      const inactive = data.inactiveDrivers || 0;

      return total > 0
        ? `${inactive} (${Math.round((inactive / total) * 100)}%)`
        : "0";
    },
    description: "Com status inativo",
  },
  {
    key: "owned-drivers",
    title: "Motoristas Próprios",
    valueKey: "ownedDrivers",
    icon: UserCog,
    variant: "primary",
    calculateValue: (data) => {
      const total = data.totalDrivers || 0;
      const owned = data.ownedDrivers || 0;

      return total > 0
        ? `${owned} (${Math.round((owned / total) * 100)}%)`
        : "0";
    },
    description: "Contrato próprio",
  },
];

export { driverStats };
