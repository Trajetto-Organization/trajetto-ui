"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { readBusinessIdParam } from "@/lib/business-id-param";

import { RouteBoard } from "./route-board";

/**
 * The monitoring board: the routes of the day, each with its completion and
 * one dot per delivery, live (decision 6.6).
 *
 * The Torre's default view since the product meeting of 14/10/2026, which
 * named it the most important screen of the operation. The board by driver
 * that sat beside it was dropped in the same meeting ("não faz muito
 * sentido"): the driver's day is the route's day, and the position lives on
 * the Painel's map.
 */
const MonitoringPanel = (): JSX.Element => {
  const params = useSearchParams();
  const pathname = usePathname();

  const mode = pathname?.startsWith("/admin") ? "admin" : "dashboard";

  // Only /admin picks the company. On /dashboard it is always the session's:
  // a stale or foreign id left in the address would otherwise ask for
  // another company and draw a refusal under the company's own numbers.
  const businessId =
    mode === "admin"
      ? readBusinessIdParam(params?.get("businessId"))
      : undefined;

  return (
    <div className="space-y-3" data-tutorial="monitoring-board">
      {/* Keyed by company (decision 2.6): a switch starts from scratch. */}
      <RouteBoard
        key={businessId ?? "session"}
        businessId={businessId}
        mode={mode}
      />
    </div>
  );
};

export { MonitoringPanel };
