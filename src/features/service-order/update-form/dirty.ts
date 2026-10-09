import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { dayToSend, pickedDayChanged } from "@/features/vehicle/lib/picked-day";

import { amountOf } from "../lib/service-order-rules";
import type { ServiceOrderRow } from "../server-table";

/**
 * The edit form's fields as strings, and whether any of them changed
 * (decision 2.5: Save stays disabled until something did). Pure, so the rule
 * is tested without a form.
 */
const ORDER_FIELDS = [
  "date",
  "completion_date",
  "maintenance_type",
  "total_amount",
  "description",
  "new_mileage_after_service",
] as const;

const SNAPSHOT_FIELDS = [
  "current_mileage_at_service",
  "maintenance_interval_km_at_service",
  "last_maintenance_mileage_at_service",
] as const;

function toFieldValues(order: ServiceOrderRow): Record<string, string> {
  const number = (value: number | null | undefined) =>
    value === null || value === undefined ? "" : String(value);

  return {
    date: order.date ? String(order.date) : "",
    completion_date: order.completion_date ? String(order.completion_date) : "",
    maintenance_type: order.maintenance_type,
    total_amount: formatToBrazilianCurrency(amountOf(order.total_amount)),
    description: order.description ?? "",
    new_mileage_after_service: number(order.new_mileage_after_service),
    current_mileage_at_service: number(order.current_mileage_at_service),
    maintenance_interval_km_at_service: number(
      order.maintenance_interval_km_at_service,
    ),
    last_maintenance_mileage_at_service: number(
      order.last_maintenance_mileage_at_service,
    ),
  };
}

function sameNumber(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return !a.trim() && !b.trim();

  return Number(a.replace(",", ".")) === Number(b.replace(",", "."));
}

function orderFieldsChanged(
  original: Record<string, string>,
  current: Record<string, string>,
  { includeSnapshot }: { includeSnapshot: boolean },
): boolean {
  const fields = includeSnapshot
    ? [...ORDER_FIELDS, ...SNAPSHOT_FIELDS]
    : ORDER_FIELDS;

  return fields.some((field) => {
    const before = original[field] ?? "";
    const after = current[field] ?? "";

    // A picked day: the same day picked again (local midnight over a stored
    // 00:00 UTC) is not a change, nor the same instant written another way.
    if (field === "date" || field === "completion_date") {
      return pickedDayChanged(before || null, after || null);
    }

    if (field === "total_amount") {
      return formatCurrencyToNumber(before) !== formatCurrencyToNumber(after);
    }

    if (field === "maintenance_type" || field === "description") {
      return before.trim() !== after.trim();
    }

    return !sameNumber(before, after);
  });
}

interface OrderDays {
  date: string;
  completion_date: string;
}

/**
 * The two day fields as the edit posts them (features/vehicle/lib/picked-day
 * dayToSend): exactly as stored while the day is unchanged, so an edit that
 * did not touch the day does not move the order from 00:00 UTC to local
 * midnight; the picked day otherwise. A cleared completion goes out empty.
 */
function orderDaysToSend(
  order: Pick<ServiceOrderRow, "date" | "completion_date">,
  picked: OrderDays,
): OrderDays {
  return {
    date: dayToSend(order.date || null, picked.date),
    completion_date: dayToSend(
      order.completion_date || null,
      picked.completion_date,
    ),
  };
}

export { orderDaysToSend, orderFieldsChanged, toFieldValues };
