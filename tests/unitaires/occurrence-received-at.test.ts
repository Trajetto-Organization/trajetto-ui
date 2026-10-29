import { describe, expect, it } from "vitest";

import { delayedOccurredAt } from "@/features/deliveries/occurrences/received-at";

/**
 * When the "Recebida em" cell also says when the occurrence happened.
 *
 * The app dates every report by the tap, online too, so occurred_at is almost
 * always a few seconds before created_at. Only a send that waited (no signal,
 * the offline queue) earns the second line.
 */
const ARRIVED = "2026-09-28T12:00:00.000Z";

describe("delayedOccurredAt", () => {
  it("ignores the seconds an ordinary online send takes", () => {
    expect(
      delayedOccurredAt({
        created_at: ARRIVED,
        occurred_at: "2026-09-28T11:59:30.000Z",
      }),
    ).toBeNull();
  });

  it("ignores a gap just under five minutes", () => {
    expect(
      delayedOccurredAt({
        created_at: ARRIVED,
        occurred_at: "2026-09-28T11:55:00.001Z",
      }),
    ).toBeNull();
  });

  it("shows a report that waited five minutes or more", () => {
    expect(
      delayedOccurredAt({
        created_at: ARRIVED,
        occurred_at: "2026-09-28T11:55:00.000Z",
      }),
    ).toBe("2026-09-28T11:55:00.000Z");

    expect(
      delayedOccurredAt({
        created_at: ARRIVED,
        occurred_at: "2026-09-25T10:05:00.000Z",
      }),
    ).toBe("2026-09-25T10:05:00.000Z");
  });

  it("ignores a device clock ahead of the server", () => {
    expect(
      delayedOccurredAt({
        created_at: ARRIVED,
        occurred_at: "2026-09-28T12:20:00.000Z",
      }),
    ).toBeNull();
  });

  it("has nothing to add without occurred_at", () => {
    expect(
      delayedOccurredAt({ created_at: ARRIVED, occurred_at: null }),
    ).toBeNull();
    expect(delayedOccurredAt({ created_at: ARRIVED })).toBeNull();
  });
});
