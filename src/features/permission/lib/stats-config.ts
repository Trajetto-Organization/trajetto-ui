"use client";

import { KeyRound, PencilLine, Eye } from "lucide-react";

import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import { countWithShare } from "@/features/user/lib/scope";

/**
 * The permission cards. Every number is the API's `searchMeta`, counted over
 * the whole company under the other filters (decision 8.8), never over the
 * page on screen.
 */
const permissionStats: StatConfig[] = [
  {
    key: "total-permissions",
    title: "Total de Permissões",
    valueKey: "totalPermissions",
    description: "Na busca e nos filtros atuais",
    icon: KeyRound,
    variant: "primary",
    calculateValue: (data) =>
      data.totalPermissions === undefined ? "—" : data.totalPermissions,
  },
  {
    key: "writable-permissions",
    title: "Com Escrita",
    valueKey: "writable",
    description: "Leem e alteram o recurso",
    icon: PencilLine,
    variant: "warning",
    calculateValue: (data) =>
      countWithShare(data.writable, data.totalPermissions),
  },
  {
    key: "read-only-permissions",
    title: "Só Leitura",
    valueKey: "readOnly",
    description: "Consultam sem alterar",
    icon: Eye,
    variant: "success",
    calculateValue: (data) =>
      countWithShare(data.readOnly, data.totalPermissions),
  },
];

export { permissionStats };
