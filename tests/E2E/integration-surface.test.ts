import { test, expect } from "@playwright/test";

import {
  INTEGRATION_TABS,
  parseIntegrationTab,
} from "../../src/features/integrations/lib/tabs";

import {
  STATUS_FILTERS,
  STATUS_LABELS,
  STATUS_TONES,
  type WebhookDeliveryStatus,
} from "../../src/features/integrations/lib/status";

import {
  formatDuration,
  formatMoment,
} from "../../src/features/integrations/lib/format";

const ALL_STATUSES: WebhookDeliveryStatus[] = [
  "PENDING",
  "PROCESSING",
  "DELIVERED",
  "FAILED",
];

test.describe("the integrations screen", () => {
  test("opens on the keys when the URL says nothing useful", () => {
    // A tab in the URL is a link somebody pasted. An unknown one is a link
    // from an older build, and landing on a blank panel would read as the
    // page being broken.
    expect(parseIntegrationTab(undefined)).toBe("api-keys");
    expect(parseIntegrationTab("")).toBe("api-keys");
    expect(parseIntegrationTab("monitoramento")).toBe("api-keys");

    expect(parseIntegrationTab("monitor")).toBe("monitor");
    expect(parseIntegrationTab("webhooks")).toBe("webhooks");
  });

  test("names each tab for what a person is going to do there", () => {
    expect(INTEGRATION_TABS.map((tab) => tab.value)).toEqual([
      "api-keys",
      "webhooks",
      "monitor",
    ]);

    for (const tab of INTEGRATION_TABS) {
      expect(tab.label.length, tab.value).toBeGreaterThan(5);
    }
  });
});

test.describe("the status of an envio", () => {
  test("has a word for every status the API can send", () => {
    // The map is exhaustive by type, so this is the runtime half of the same
    // promise: a blank badge on this screen is somebody being told nothing
    // while a customer waits on the phone.
    for (const status of ALL_STATUSES) {
      expect(STATUS_LABELS[status], status).toBeTruthy();
      expect(STATUS_TONES[status], status).toBeTruthy();
    }
  });

  test("paints only a real failure as a failure", () => {
    // PENDING and PROCESSING are the queue working — we retry for six hours.
    // Red on those produces somebody resending an event that was about to go
    // out anyway, which is how a duplicate reaches an ERP.
    expect(STATUS_TONES.FAILED).toContain("destructive");

    expect(STATUS_TONES.PENDING).not.toContain("destructive");
    expect(STATUS_TONES.PROCESSING).not.toContain("destructive");
    expect(STATUS_TONES.DELIVERED).not.toContain("destructive");
  });

  test("puts the failures where somebody looking for them will land", () => {
    // Nobody opens this screen to admire what worked.
    expect(STATUS_FILTERS[0].value).toBe("ALL");
    expect(STATUS_FILTERS[1].value).toBe("FAILED");
  });

  test("offers no filter for a status the API cannot answer with", () => {
    for (const filter of STATUS_FILTERS) {
      if (filter.value === "ALL") continue;

      expect(ALL_STATUSES, filter.value).toContain(filter.value);
    }
  });
});

test.describe("reading the numbers on the monitor", () => {
  test("keeps 'nunca aconteceu' distinct from 'zero milissegundos'", () => {
    // The p95 is null before anything was delivered in the window. Showing
    // "0 ms" there would read as an endpoint answering instantly, which is
    // the opposite of the truth.
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(undefined)).toBe("—");

    expect(formatDuration(0)).toBe("0 ms");
  });

  test("switches to seconds where a person would", () => {
    expect(formatDuration(940)).toBe("940 ms");
    expect(formatDuration(2400)).toContain("2,4");
    expect(formatDuration(2400)).toContain("s");
  });

  test("shows a dash for a moment that has not happened", () => {
    // `delivered_at` is null while a delivery is still queued, and the Intl
    // formatter given a null date prints "Invalid Date" — a row that reads
    // like a bug instead of a row that is simply still waiting.
    expect(formatMoment(null)).toBe("—");
    expect(formatMoment(undefined)).toBe("—");

    expect(formatMoment("2026-09-15T12:00:00.000Z")).not.toContain("Invalid");
  });
});
