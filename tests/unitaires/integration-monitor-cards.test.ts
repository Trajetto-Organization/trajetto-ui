// @vitest-environment node
import { describe, expect, it } from "vitest";

import { monitorCardLabels } from "@/features/integrations/lib/status";

/**
 * The monitor's cards say what they count.
 *
 * The API's `delivered` and `failed` cover the events of the chosen period,
 * like the p95 beside them and the list below them (DLVB-29); `pending` is
 * whatever is still in flight, at any age. A card reading just "Entregues"
 * next to "p95 (24h)" invites reading it as the month, or as everything ever
 * sent.
 */
describe("the webhook monitor's cards", () => {
  it("name the period on the settled counters and the p95", () => {
    expect(monitorCardLabels("24h")).toMatchObject({
      delivered: "Entregues (24h)",
      failed: "Falharam (24h)",
      p95: "p95 (24h)",
    });

    expect(monitorCardLabels("30d")).toMatchObject({
      delivered: "Entregues (30 dias)",
      failed: "Falharam (30 dias)",
    });
  });

  it("leave the queue unqualified: it is everything still in flight", () => {
    expect(monitorCardLabels("7d").pending).toBe("Na fila");
  });
});
