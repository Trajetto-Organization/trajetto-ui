"use client";

import { Users, UserCheck, Shield, Mail } from "lucide-react";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

const masterUsersStats: StatConfig[] = [
  {
    key: "total-master-users",
    title: "Total de Masters",
    valueKey: "totalMasterUsers",
    description: "Cadastrados no sistema",
    icon: Users,
    variant: "primary",
  },
  {
    key: "active-master-users",
    title: "Masters Ativos",
    valueKey: "activeMasterUsers",
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
    calculateValue: (data) => {
      const total = data.totalMasterUsers || 0;
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
    calculateValue: (data) => {
      const total = data.totalMasterUsers || 0;
      const enabled = data.twoFactorEnabled || 0;

      return total > 0
        ? `${enabled} (${Math.round((enabled / total) * 100)}%)`
        : "0";
    },
    description: "Com 2FA habilitado",
  },
];

export { masterUsersStats };
