"use client";

import { Mail, Shield, UserCheck, Users } from "lucide-react";

import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import { countWithShare } from "./scope";

/**
 * The user cards. Every number is the API's `searchMeta`, counted over the
 * whole company (or every master) under the other filters (decision 8.8) —
 * the old cards counted three of the four among the ten rows on screen.
 */
const userStats: StatConfig[] = [
  {
    key: "total-users",
    title: "Total de Usuários",
    valueKey: "totalUsers",
    description: "Na busca e nos filtros atuais",
    icon: Users,
    variant: "primary",
    calculateValue: (data) =>
      data.totalUsers === undefined ? "—" : data.totalUsers,
  },
  {
    key: "active-users",
    title: "Usuários Ativos",
    valueKey: "activeUsers",
    description: "Sem acesso revogado",
    icon: UserCheck,
    variant: "success",
    calculateValue: (data) => countWithShare(data.activeUsers, data.totalUsers),
  },
  {
    key: "email-verified",
    title: "E-mail Verificado",
    valueKey: "emailVerified",
    icon: Mail,
    variant: "warning",
    description: "E-mails confirmados",
    calculateValue: (data) =>
      countWithShare(data.emailVerified, data.listTotal),
  },
  {
    key: "two-factor",
    title: "Autenticação 2FA",
    valueKey: "twoFactor",
    icon: Shield,
    variant: "success",
    description: "Com 2FA habilitado",
    calculateValue: (data) =>
      countWithShare(data.twoFactor, data.twoFactorTotal),
  },
];

export { userStats };

/**
 * The master cards: the same numbers, over the platform's masters (the one
 * asking excluded), and never over the page — the old ones counted "ativos",
 * "2FA" and "e-mail verificado" among the rows on screen.
 */
const masterUserStats: StatConfig[] = userStats.map((stat) => {
  switch (stat.key) {
    case "total-users":
      return { ...stat, key: "total-master-users", title: "Total de Masters" };
    case "active-users":
      return { ...stat, key: "active-master-users", title: "Masters Ativos" };
    default:
      return stat;
  }
});

export { masterUserStats };
