"use client";

import { useState } from "react";

import { usePathname, useSearchParams } from "next/navigation";

import { ScrollableTabsList, Tabs, TabsTrigger } from "@/components/ui/tabs";

import { readBusinessIdParam } from "@/lib/business-id-param";

import { DriverBoard } from "./driver-board";
import { RouteBoard } from "./route-board";

type MonitoringView = "routes" | "drivers";

/**
 * The monitoring board, by route or by driver.
 *
 * By route is the partner's view (decision 6.6): each route of the day with
 * its completion and one dot per delivery, live. By driver is the day's load
 * of each driver, on the same definition as the tower's funnel, with the
 * progress counting insucessos as resolved.
 */
const MonitoringPanel = (): JSX.Element => {
  const params = useSearchParams();
  const pathname = usePathname();

  const [view, setView] = useState<MonitoringView>(
    params?.get("view") === "drivers" ? "drivers" : "routes",
  );

  /**
   * The choice lives in the address too: a route event re-renders the tab
   * from the server, and the company selector keeps `view` on a switch.
   * replaceState and not the router: nothing on the server depends on it.
   */
  const choose = (next: MonitoringView) => {
    setView(next);

    try {
      const url = new URL(window.location.href);

      url.searchParams.set("view", next);
      window.history.replaceState(window.history.state, "", url.toString());
    } catch {
      // The local state already switched; the address is a convenience.
    }
  };

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
      <Tabs
        value={view}
        onValueChange={(next) => choose(next as MonitoringView)}
      >
        {/* The one tab strip of the product (decision 3.1). */}
        <ScrollableTabsList aria-label="Visão do monitoramento">
          <TabsTrigger value="routes">Por rota</TabsTrigger>
          <TabsTrigger value="drivers">Por motorista</TabsTrigger>
        </ScrollableTabsList>
      </Tabs>

      {/* Keyed by company (decision 2.6): a switch starts from scratch. */}
      {view === "routes" ? (
        <RouteBoard
          key={businessId ?? "session"}
          businessId={businessId}
          mode={mode}
        />
      ) : (
        <DriverBoard
          key={businessId ?? "session"}
          businessId={businessId}
          mode={mode}
        />
      )}
    </div>
  );
};

export { MonitoringPanel };
