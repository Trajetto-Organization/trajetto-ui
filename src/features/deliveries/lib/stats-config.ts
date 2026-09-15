"use client";

import {
  Building2,
  Camera,
  CheckCircle2,
  History,
  IdCard,
  MessageSquareWarning,
  Package,
  ShieldAlert,
  TriangleAlert,
  Truck,
} from "lucide-react";

import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";
import type { DeliveryTab } from "./tabs";

/**
 * The numbers come from the API aggregate (whole company), never from the
 * page on screen — a card that only counts the current page misleads.
 */
const deliveryStats: StatConfig[] = [
  {
    key: "total-deliveries",
    title: "Total de Entregas",
    valueKey: "totalDeliveries",
    description: "Cadastradas no sistema",
    icon: Package,
    variant: "primary",
  },
  {
    key: "in-transit",
    title: "Em Rota",
    valueKey: "inTransit",
    icon: Truck,
    variant: "primary",
    calculateValue: (data) => {
      const total = data.totalDeliveries || 0;
      const inTransit = data.inTransit || 0;

      return total > 0
        ? `${inTransit} (${Math.round((inTransit / total) * 100)}%)`
        : "0";
    },
    description: "Saíram para entrega",
  },
  {
    key: "delivered",
    title: "Entregues",
    valueKey: "delivered",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalDeliveries || 0;
      const delivered = data.delivered || 0;

      return total > 0
        ? `${delivered} (${Math.round((delivered / total) * 100)}%)`
        : "0";
    },
    description: "Comprovadas pelo motorista",
  },
  {
    key: "failed",
    title: "Insucessos",
    valueKey: "failed",
    icon: TriangleAlert,
    variant: "danger",
    calculateValue: (data) => {
      const total = data.totalDeliveries || 0;
      const failed = data.failed || 0;

      return total > 0
        ? `${failed} (${Math.round((failed / total) * 100)}%)`
        : "0";
    },
    description: "Aguardando reentrega",
  },
];

const shipperStats: StatConfig[] = [
  {
    key: "total-shippers",
    title: "Total de Embarcadores",
    valueKey: "totalShippers",
    description: "Cadastrados no sistema",
    icon: Building2,
    variant: "primary",
  },
  {
    key: "active-shippers",
    title: "Ativos",
    valueKey: "activeShippers",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalShippers || 0;
      const active = data.activeShippers || 0;

      return total > 0
        ? `${active} (${Math.round((active / total) * 100)}%)`
        : "0";
    },
    description: "Disponíveis para novas entregas",
  },
  {
    key: "with-cnpj",
    title: "Com CNPJ",
    valueKey: "withCnpj",
    icon: IdCard,
    variant: "primary",
    calculateValue: (data) => {
      const total = data.totalShippers || 0;
      const withCnpj = data.withCnpj || 0;

      return total > 0
        ? `${withCnpj} (${Math.round((withCnpj / total) * 100)}%)`
        : "0";
    },
    description: "Casam com o emitente da NF-e",
  },
  {
    key: "inactive-shippers",
    title: "Inativos",
    valueKey: "inactiveShippers",
    icon: Package,
    variant: "warning",
    calculateValue: (data) => {
      const total = data.totalShippers || 0;
      const inactive = data.inactiveShippers || 0;

      return total > 0
        ? `${inactive} (${Math.round((inactive / total) * 100)}%)`
        : "0";
    },
    description: "Fora dos novos cadastros",
  },
];

const occurrenceTypeStats: StatConfig[] = [
  {
    key: "total-types",
    title: "Total de Tipos",
    valueKey: "totalTypes",
    description: "No catálogo da empresa",
    icon: TriangleAlert,
    variant: "primary",
  },
  {
    key: "active-types",
    title: "Ativos",
    valueKey: "activeTypes",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalTypes || 0;
      const active = data.activeTypes || 0;

      return total > 0
        ? `${active} (${Math.round((active / total) * 100)}%)`
        : "0";
    },
    description: "Disponíveis para o motorista",
  },
  {
    key: "blocking-types",
    title: "Impeditivos",
    valueKey: "blockingTypes",
    icon: ShieldAlert,
    variant: "danger",
    calculateValue: (data) => {
      const total = data.totalTypes || 0;
      const blocking = data.blockingTypes || 0;

      return total > 0
        ? `${blocking} (${Math.round((blocking / total) * 100)}%)`
        : "0";
    },
    description: "Marcam a entrega como insucesso",
  },
  {
    key: "photo-types",
    title: "Exigem Foto",
    valueKey: "photoTypes",
    icon: Camera,
    variant: "warning",
    calculateValue: (data) => {
      const total = data.totalTypes || 0;
      const photo = data.photoTypes || 0;

      return total > 0
        ? `${photo} (${Math.round((photo / total) * 100)}%)`
        : "0";
    },
    description: "Comprovação obrigatória",
  },
];

const occurrenceFeedStats: StatConfig[] = [
  {
    key: "total-occurrences",
    title: "Total de Ocorrências",
    valueKey: "totalOccurrences",
    description: "Registradas na operação",
    icon: TriangleAlert,
    variant: "primary",
  },
  {
    key: "blocking-occurrences",
    title: "Impeditivas",
    valueKey: "blockingOccurrences",
    icon: ShieldAlert,
    variant: "danger",
    calculateValue: (data) => {
      const total = data.totalOccurrences || 0;
      const blocking = data.blockingOccurrences || 0;

      return total > 0
        ? `${blocking} (${Math.round((blocking / total) * 100)}%)`
        : "0";
    },
    description: "Derrubaram a entrega",
  },
  {
    key: "informational-occurrences",
    title: "Informativas",
    valueKey: "informationalOccurrences",
    icon: CheckCircle2,
    variant: "success",
    description: "Só registro, sem impacto",
  },
];

const monitoringStats: StatConfig[] = [
  {
    key: "unassigned",
    title: "Sem Motorista",
    valueKey: "unassigned",
    icon: ShieldAlert,
    variant: "danger",
    description: "Pendentes aguardando rota",
  },
  {
    key: "designated",
    title: "Designadas",
    valueKey: "designated",
    icon: IdCard,
    variant: "primary",
    description: "Aguardando iniciar a rota",
  },
  {
    key: "in-route",
    title: "Em Rota",
    valueKey: "inRoute",
    icon: Truck,
    variant: "primary",
    description: "Na rua agora",
  },
  {
    key: "delivered-today",
    title: "Entregues Hoje",
    valueKey: "deliveredToday",
    icon: CheckCircle2,
    variant: "success",
    description: "Comprovadas no dia",
  },
  {
    key: "failed-today",
    title: "Insucessos Hoje",
    valueKey: "failedToday",
    icon: TriangleAlert,
    variant: "danger",
    description: "Precisam de decisão",
  },
  {
    key: "occurrences-today",
    title: "Ocorrências Hoje",
    valueKey: "occurrencesToday",
    icon: Camera,
    variant: "primary",
    description: "Registradas em campo",
  },
];

/**
 * The catalogue's own numbers.
 *
 * `used` is the one worth a card: it separates the vocabulary the company
 * actually speaks from the words somebody typed once and forgot — and it is
 * what says which reasons can still be deleted.
 */
const statusChangeReasonStats: StatConfig[] = [
  {
    key: "total-reasons",
    title: "Total de Motivos",
    valueKey: "totalReasons",
    description: "No catálogo da empresa",
    icon: MessageSquareWarning,
    variant: "primary",
  },
  {
    key: "active-reasons",
    title: "Ativos",
    valueKey: "activeReasons",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalReasons || 0;
      const active = data.activeReasons || 0;

      return total > 0
        ? `${active} (${Math.round((active / total) * 100)}%)`
        : "0";
    },
    description: "Disponíveis no seletor",
  },
  {
    key: "used-reasons",
    title: "Em uso",
    valueKey: "usedReasons",
    icon: History,
    variant: "warning",
    description: "Já explicam alguma mudança — não podem ser excluídos",
  },
];

const STATS_BY_TAB: Record<DeliveryTab, StatConfig[]> = {
  deliveries: deliveryStats,
  occurrences: occurrenceFeedStats,
  monitoring: monitoringStats,
  // The chat is a conversation surface, not a metrics one — no cards.
  chat: [],
  shippers: shipperStats,
  "occurrence-types": occurrenceTypeStats,
  "status-change-reasons": statusChangeReasonStats,

  // No cards: the listing endpoint sends no aggregate, and counting the rows
  // of the page on screen would print "12 importações" to a company that has
  // four hundred. A number that is wrong is worse than no number.
  imports: [],
};

/** Maps the API's meta line into the keys the cards above read. */
function buildStatsData(
  activeTab: DeliveryTab,
  total: number,
  searchMeta: Record<string, unknown> | undefined,
): Record<string, number> {
  if (activeTab === "occurrences") {
    const totalOccurrences = Number(searchMeta?.total ?? total);
    const blocking = Number(searchMeta?.blocking ?? 0);

    return {
      totalOccurrences,
      blockingOccurrences: blocking,
      informationalOccurrences: totalOccurrences - blocking,
    };
  }

  if (activeTab === "monitoring") {
    return {
      unassigned: Number(searchMeta?.unassigned ?? 0),
      designated: Number(searchMeta?.designated ?? 0),
      inRoute: Number(searchMeta?.inRoute ?? 0),
      deliveredToday: Number(searchMeta?.deliveredToday ?? 0),
      failedToday: Number(searchMeta?.failedToday ?? 0),
      occurrencesToday: Number(searchMeta?.occurrencesToday ?? 0),
    };
  }

  if (activeTab === "shippers") {
    return {
      totalShippers: Number(searchMeta?.total ?? total),
      activeShippers: Number(searchMeta?.active ?? 0),
      withCnpj: Number(searchMeta?.withCnpj ?? 0),
      inactiveShippers:
        Number(searchMeta?.total ?? total) - Number(searchMeta?.active ?? 0),
    };
  }

  if (activeTab === "status-change-reasons") {
    return {
      totalReasons: Number(searchMeta?.total ?? total),
      activeReasons: Number(searchMeta?.active ?? 0),
      usedReasons: Number(searchMeta?.used ?? 0),
    };
  }

  if (activeTab === "occurrence-types") {
    return {
      totalTypes: Number(searchMeta?.total ?? total),
      activeTypes: Number(searchMeta?.active ?? 0),
      blockingTypes: Number(searchMeta?.blocking ?? 0),
      photoTypes: Number(searchMeta?.requiringPhoto ?? 0),
    };
  }

  const statusCounts =
    (searchMeta?.statusCounts as Record<string, number> | undefined) ?? {};

  const totalDeliveries = Object.values(statusCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  return {
    totalDeliveries: totalDeliveries || total,
    inTransit: statusCounts.IN_TRANSIT ?? 0,
    delivered: statusCounts.DELIVERED ?? 0,
    failed: statusCounts.FAILED ?? 0,
  };
}

export { STATS_BY_TAB, buildStatsData };
