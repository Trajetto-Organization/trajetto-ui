/**
 * What the "Veículos" card of Limites de Uso says. Pure, and tested.
 *
 * The card used to show two numbers under "Veículos ativos", which counted
 * every vehicle but the INACTIVE ones — while the Vehicles page calls only
 * ACTIVE "Ativos". It now names the number for what it is ("ocupando vaga"),
 * shows the fleet by status with the Vehicles page's own labels, and says
 * what happens at and beyond the contract.
 */
import {
  VEHICLE_STATUS_LABELS,
  type VehicleStatus,
} from "@/lib/vehicle-status";
import type { VehicleSlotLevel } from "@/lib/vehicle-slot-usage";

interface PlanModule {
  module: string;
  enabled: boolean;
}

type VehicleStatusCounts = Record<VehicleStatus, number>;

type LimitBadgeTone = "neutral" | "success" | "warning" | "danger" | "notice";

interface VehicleStatusRow {
  key: VehicleStatus;
  label: string;
  count: number;
  occupiesSlot: boolean;
}

/**
 * The badge per level. "Dentro do limite", not "Ativo": next to a breakdown
 * whose first row is the status "Ativo", the same word would mean two things.
 */
const VEHICLE_SLOT_BADGES: Record<
  VehicleSlotLevel,
  { label: string; tone: LimitBadgeTone }
> = {
  unlimited: { label: "Sem limite", tone: "neutral" },
  ok: { label: "Dentro do limite", tone: "success" },
  high: { label: "Uso elevado", tone: "warning" },
  full: { label: "Limite atingido", tone: "danger" },
  over: { label: "Acima do limite", tone: "danger" },
};

/** What counts against the plan, and the customer's own lever. */
const VEHICLE_SLOTS_NOTE =
  "Ocupa vaga todo veículo que não está Inativo. Inativar um veículo libera a vaga e mantém o histórico.";

const plural = (count: number, one: string, many: string): string =>
  count === 1 ? `1 ${one}` : `${count.toLocaleString("pt-BR")} ${many}`;

/** "5 vagas restantes no plano", "1 vaga restante no plano", the full and over cases. */
function vehicleSlotsSentence(count: number, limit: number): string {
  if (limit <= 0) {
    return "Sem limite configurado: o cadastro de veículos está livre.";
  }

  if (count > limit) {
    return `${plural(count - limit, "veículo", "veículos")} acima do contratado — novos cadastros e reativações são recusados até a frota caber no plano.`;
  }

  if (count === limit) {
    return "Todas as vagas do plano estão em uso — novos cadastros e reativações são recusados.";
  }

  const remaining = limit - count;

  return remaining === 1
    ? "1 vaga restante no plano"
    : `${remaining.toLocaleString("pt-BR")} vagas restantes no plano`;
}

/**
 * The fleet by status, slot-occupying ones first. "Em rota" is written only
 * by a route (Gestão de Entregas): it shows with that module, with an
 * unknown plan, or when a vehicle is in it — the Vehicles page's rule.
 */
function vehicleStatusRows(
  counts: VehicleStatusCounts | null | undefined,
  modules: readonly PlanModule[] | null | undefined,
): VehicleStatusRow[] {
  if (!counts) return [];

  const known = modules !== null && modules !== undefined;
  const deliveries = (modules ?? []).some(
    (entry) => entry.enabled && entry.module === "DELIVERIES",
  );

  const order: VehicleStatus[] = ["ACTIVE", "BLOCKED", "IN_ROUTE", "INACTIVE"];

  return order
    .filter(
      (key) =>
        key !== "IN_ROUTE" || !known || deliveries || (counts[key] ?? 0) > 0,
    )
    .map((key) => ({
      key,
      label: VEHICLE_STATUS_LABELS[key],
      count: counts[key] ?? 0,
      occupiesSlot: key !== "INACTIVE",
    }));
}

/**
 * The footer: every vehicle of the company. Without the breakdown (an API
 * older than it) the inactive ones are named, since no row lists them.
 */
function registeredTotalSentence(total: number, inactive?: number): string {
  if (total <= 0) return "Nenhum veículo cadastrado";

  const base = `Total cadastrado: ${plural(total, "veículo", "veículos")}`;

  if (inactive === undefined || inactive <= 0) return base;

  return `${base}, ${plural(inactive, "inativo", "inativos")}`;
}

export {
  VEHICLE_SLOTS_NOTE,
  VEHICLE_SLOT_BADGES,
  registeredTotalSentence,
  vehicleSlotsSentence,
  vehicleStatusRows,
};
export type { LimitBadgeTone, VehicleStatusCounts, VehicleStatusRow };
