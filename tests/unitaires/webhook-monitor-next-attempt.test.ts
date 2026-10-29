// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { nextAttemptOf } from "@/features/integrations/lib/status";

/**
 * "Próxima tentativa" only on a row the queue will still try.
 *
 * The API's `availableAt` is the queue's key, not a schedule. Since the claim
 * writes the lease end into it (PG-19), a row being sent carries a moment a
 * couple of minutes ahead, and a row that was just DELIVERED keeps it: the
 * monitor then said "próxima tentativa às 10:02" under an event delivered at
 * 10:00 — which reads as "it will go out again", and is how somebody resends
 * it by hand and the customer's ERP gets it twice.
 */
const ahead = new Date(Date.now() + 2 * 60_000).toISOString();

describe("the next attempt of a webhook", () => {
  it("is its due time while it waits in the queue", () => {
    expect(nextAttemptOf({ status: "PENDING", availableAt: ahead })).toBe(
      ahead,
    );
  });

  it("is none for a row being sent, delivered or given up on", () => {
    for (const status of ["PROCESSING", "DELIVERED", "FAILED"] as const) {
      expect(nextAttemptOf({ status, availableAt: ahead }), status).toBeNull();
    }
  });

  it("is what the monitor shows under that label", () => {
    const panel = readFileSync(
      resolve(process.cwd(), "src/features/integrations/monitor/panel.tsx"),
      "utf8",
    );

    expect(panel).toContain("formatMoment(nextAttemptOf(row))");
    expect(panel).not.toContain("formatMoment(row.availableAt)");
  });
});
