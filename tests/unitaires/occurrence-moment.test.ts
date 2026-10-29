import { describe, expect, it } from "vitest";

import { occurrenceMoment } from "@/features/deliveries/lib/panels";

/**
 * The "Data" column of the occurrence feed (MOB-08).
 *
 * The driver's app queues occurrences in dead zones and sends them later. The
 * API now keeps when the driver reported it (`occurred_at`) apart from when it
 * arrived (`created_at`); the feed shows the first, and falls back to the
 * second for rows written before — and for an API that does not send it yet,
 * since the web deploys on its own schedule.
 */
describe("occurrenceMoment", () => {
  it("is when the driver reported it, for a report sent later", () => {
    expect(
      occurrenceMoment({
        created_at: "2026-09-24T13:40:00.000Z",
        occurred_at: "2026-09-24T10:05:00.000Z",
      }),
    ).toBe("2026-09-24T10:05:00.000Z");
  });

  it("is when it arrived when the API does not say otherwise", () => {
    expect(
      occurrenceMoment({
        created_at: "2026-09-24T13:40:00.000Z",
        occurred_at: null,
      }),
    ).toBe("2026-09-24T13:40:00.000Z");

    expect(occurrenceMoment({ created_at: "2026-09-24T13:40:00.000Z" })).toBe(
      "2026-09-24T13:40:00.000Z",
    );
  });
});
