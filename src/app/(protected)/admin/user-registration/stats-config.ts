"use client";

import { Users, UserCheck, Shield, Mail } from "lucide-react";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

/**
 * Configuring stats for the user-registration page
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove, or modify stats here.
 */
const userRegistrationStats: StatConfig[] = [
  {
    key: "total-users",
    title: "Total de Usuários",
    valueKey: "totalUsers",
    description: "Cadastrados no sistema",
    icon: Users,
    variant: "primary",
  },
  {
    key: "active-users",
    title: "Usuários Ativos",
    valueKey: "activeUsers",
    description: "Sem acesso revogado",
    icon: UserCheck,
    variant: "success",
  },
  {
    key: "email-verified",
    title: "E-mail Verificado",
    valueKey: "emailVerified",
    icon: Mail,
    variant: "warning",
    // Calculates the percentage dynamically
    calculateValue: (data) => {
      const total = data.totalUsers || 0;
      const verified = data.emailVerified || 0;
      return total > 0
        ? `${verified} (${Math.round((verified / total) * 100)}%)`
        : "0";
    },
    description: "E-mails verificados",
  },
  {
    key: "two-factor",
    title: "Autenticação 2FA",
    valueKey: "twoFactorEnabled",
    icon: Shield,
    variant: "success",
    // Calculates the percentage dynamically
    calculateValue: (data) => {
      const total = data.totalUsers || 0;
      const enabled = data.twoFactorEnabled || 0;

      return total > 0
        ? `${enabled} (${Math.round((enabled / total) * 100)}%)`
        : "0";
    },
    description: "Com 2FA habilitado",
  },
];

export { userRegistrationStats };
