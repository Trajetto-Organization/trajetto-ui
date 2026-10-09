"use client";

import { UserCheck, UserCog, UserX, Users } from "lucide-react";

import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import { countWithShare } from "./driver-rules";

/**
 * The driver cards. Every number is the API's `searchMeta`, counted over the
 * whole company under the other filters (decision 8.8) — the old cards
 * counted Ativos, Inativos and Próprios among the ten rows on screen and set
 * them beside the company's total.
 */
const driverStats: StatConfig[] = [
  {
    key: "total-drivers",
    title: "Total de Motoristas",
    valueKey: "totalDrivers",
    // searchMeta.total leaves the status filter out on purpose (Ativos +
    // Inativos = Total), so the card must not claim "every filter".
    description: "Todas as situações, na busca e nos demais filtros",
    icon: Users,
    variant: "primary",
    calculateValue: (data) =>
      data.totalDrivers === undefined ? "—" : data.totalDrivers,
  },
  {
    key: "active-drivers",
    title: "Motoristas Ativos",
    valueKey: "activeDrivers",
    icon: UserCheck,
    variant: "success",
    calculateValue: (data) =>
      countWithShare(data.activeDrivers, data.totalDrivers),
    description: "Com status ativo",
  },
  {
    key: "inactive-drivers",
    title: "Motoristas Inativos",
    valueKey: "inactiveDrivers",
    icon: UserX,
    variant: "danger",
    calculateValue: (data) =>
      countWithShare(data.inactiveDrivers, data.totalDrivers),
    description: "Com status inativo",
  },
  {
    key: "owned-drivers",
    title: "Motoristas Próprios",
    valueKey: "ownedDrivers",
    icon: UserCog,
    variant: "primary",
    calculateValue: (data) =>
      countWithShare(data.ownedDrivers, data.contractTotal),
    description: "Contrato próprio",
  },
];

export { driverStats };
