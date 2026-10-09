// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { HealthMetricsData } from "@/actions/health/get-health-metrics";
import {
  channelWarnings,
  cronAlerts,
  poolStatus,
  queueStatus,
  stuckWorkers,
  whatsappAfterAcceptance,
} from "@/features/system-metrics/rules";

/**
 * The MASTER's "Sistema" tab during an incident (OBS-04, OUTBOX-15, OBS-10,
 * OBS-11).
 *
 * The badge read only the outbox's "eligible" lag, which is null exactly when
 * everything is in backoff, and showed a green "Sem fila" — while WhatsApp
 * deliveries piled up behind a Meta outage, because the outbox turns an event
 * PUBLISHED as soon as it fans out. The per-channel numbers were in the JSON
 * and nowhere on the screen; so were webhooks, stuck workers and the pool.
 */
const NOW = new Date("2026-09-24T12:00:00.000Z");

function metrics(
  overrides: Partial<HealthMetricsData> = {},
): HealthMetricsData {
  return {
    timestamp: NOW.toISOString(),
    database: {
      active_connections: 5,
      max_connections: 100,
      connection_usage_percent: 5,
    },
    outbox: {
      pending: 0,
      failed: 0,
      oldest_pending_seconds: null,
      oldest_pending_any_seconds: null,
    },
    ai_pipeline: { pending: 0, running: 0 },
    ...overrides,
  };
}

function channel(name: string, fields: Record<string, number | null> = {}) {
  return {
    channel: name,
    pending: 0,
    processing: 0,
    delivered: 0,
    failed: 0,
    failed_total: 0,
    pending_total: 0,
    processing_lease_expired: 0,
    oldest_pending_seconds: null,
    oldest_eligible_seconds: null,
    ...fields,
  };
}

describe("queueStatus", () => {
  it("is red during a WhatsApp outage, even with the outbox's eligible lag blind", () => {
    const status = queueStatus(
      metrics({
        outbox: {
          pending: 3,
          failed: 0,
          oldest_pending_seconds: null,
          oldest_pending_any_seconds: 900,
        },
        notifications: {
          window_hours: 24,
          failed_total: 40,
          channels: [
            channel("WHATSAPP", {
              pending: 200,
              pending_total: 200,
              failed: 40,
              failed_total: 40,
              oldest_pending_seconds: 1800,
            }),
            channel("EMAIL"),
          ],
        },
      }),
    );

    expect(status.label).not.toBe("Sem fila");
    expect(status.tone).toBe("red");
  });

  it("says 'Sem fila' only when nothing at all is waiting", () => {
    const status = queueStatus(
      metrics({
        notifications: {
          window_hours: 24,
          failed_total: 0,
          channels: [channel("WHATSAPP"), channel("EMAIL")],
        },
        webhooks: {
          pending_due: 0,
          held: 0,
          oldest_due_seconds: null,
          disabled_endpoints: 0,
        },
      }),
    );

    expect(status).toEqual({ label: "Sem fila", tone: "green" });
  });

  it("is never green 'Sem fila' with events waiting, even from an older API", () => {
    // An API from before these fields: only the blind lag, null, and a count.
    const status = queueStatus(
      metrics({
        outbox: { pending: 3, failed: 0, oldest_pending_seconds: null },
      }),
    );

    expect(status.label).not.toBe("Sem fila");
    expect(status.tone).not.toBe("green");
  });

  it("counts a webhook backlog", () => {
    const status = queueStatus(
      metrics({
        webhooks: {
          pending_due: 12,
          held: 0,
          oldest_due_seconds: 420,
          disabled_endpoints: 0,
        },
      }),
    );

    expect(status.tone).toBe("red");
  });
});

describe("channelWarnings", () => {
  it("names the channels with failures today or an old backlog", () => {
    const warned = channelWarnings([
      channel("WHATSAPP", { failed: 40, oldest_pending_seconds: 1800 }),
      channel("EMAIL", { oldest_pending_seconds: 30 }),
      channel("PUSH", { processing_lease_expired: 2 }),
      channel("IN_APP"),
    ]).map((entry) => entry.channel);

    expect(warned).toEqual(["WHATSAPP", "PUSH"]);
  });
});

describe("whatsappAfterAcceptance (OUTBOX-07)", () => {
  /**
   * A WhatsApp Meta accepted and then failed keeps its delivery DELIVERED,
   * and one sent twice is a single DELIVERED row: neither shows in the
   * per-channel table. The API reads them from Meta's status callbacks.
   */
  const notifications = (extra: Record<string, number>) => ({
    window_hours: 24,
    failed_total: 0,
    channels: [channel("WHATSAPP")],
    ...extra,
  });

  it("warns when Meta failed a message it had accepted, or received one twice", () => {
    expect(
      whatsappAfterAcceptance(
        notifications({ whatsapp_failed_24h: 3, whatsapp_multi_send_24h: 0 }),
      ),
    ).toEqual({ failed: 3, multiSend: 0, warn: true });

    expect(
      whatsappAfterAcceptance(
        notifications({ whatsapp_failed_24h: 0, whatsapp_multi_send_24h: 1 }),
      ),
    ).toEqual({ failed: 0, multiSend: 1, warn: true });
  });

  it("is quiet at zero", () => {
    expect(
      whatsappAfterAcceptance(
        notifications({ whatsapp_failed_24h: 0, whatsapp_multi_send_24h: 0 }),
      ),
    ).toEqual({ failed: 0, multiSend: 0, warn: false });
  });

  it("says nothing for an API that does not report them — unknown, not zero", () => {
    expect(whatsappAfterAcceptance(notifications({}))).toBeNull();
    expect(whatsappAfterAcceptance(undefined)).toBeNull();
  });
});

describe("poolStatus", () => {
  it("is saturated when queries wait for a connection or every slot is busy", () => {
    expect(
      poolStatus({ limit: 10, open: 10, busy: 4, idle: 6, waiting: 2 })?.tone,
    ).toBe("red");
    expect(
      poolStatus({ limit: 10, open: 10, busy: 10, idle: 0, waiting: 0 })?.label,
    ).toBe("Saturado");
  });

  it("is fine with room left", () => {
    expect(
      poolStatus({ limit: 10, open: 4, busy: 2, idle: 2, waiting: 0 })?.tone,
    ).toBe("green");
  });

  it("has nothing to say when the API does not report the pool", () => {
    expect(poolStatus(undefined)).toBeNull();
  });
});

describe("workers and cron jobs", () => {
  it("lists the stuck workers", () => {
    expect(
      stuckWorkers([
        {
          replica: "api-1",
          worker: "notification-delivery-external",
          last_beat_at: NOW.toISOString(),
          running_since: NOW.toISOString(),
          last_seen_at: NOW.toISOString(),
          stuck: true,
        },
        {
          replica: "api-2",
          worker: "notification-outbox",
          last_beat_at: NOW.toISOString(),
          running_since: null,
          last_seen_at: NOW.toISOString(),
          stuck: false,
        },
      ]).map((entry) => entry.replica),
    ).toEqual(["api-1"]);

    expect(stuckWorkers(undefined)).toEqual([]);
  });

  it("flags a job left running, a failed run and a job with no success in 26 hours", () => {
    const hoursAgo = (hours: number) =>
      new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString();

    const job = (name: string, fields: Record<string, unknown>) => ({
      job: name,
      schedule: "10 4 * * *",
      last_status: "SUCCEEDED" as const,
      last_scheduled_for: hoursAgo(2),
      last_finished_at: hoursAgo(2),
      last_succeeded_at: hoursAgo(2),
      attempts: 1,
      last_error: null,
      stale_running: 0,
      ...fields,
    });

    const flagged = cronAlerts(
      [
        job("fine", {}),
        job("left-running", { last_status: "RUNNING", stale_running: 1 }),
        job("failed", { last_status: "FAILED", last_error: "lock_timeout" }),
        job("driver-position-partitions", {
          last_succeeded_at: hoursAgo(30),
          last_scheduled_for: hoursAgo(30),
        }),
      ],
      NOW,
    ).map((entry) => entry.job);

    expect(flagged).toEqual([
      "left-running",
      "failed",
      "driver-position-partitions",
    ]);
    expect(cronAlerts(undefined, NOW)).toEqual([]);
  });

  it("ignores a job no replica schedules any more", () => {
    // Removed or renamed: its rows stay for the 30 days the purge keeps them,
    // with no new success. The API reports it with schedule null; red for a
    // month on the card would be noise (the ops alerting drops it too).
    const retired = {
      job: "old-cleanup",
      schedule: null,
      last_status: "FAILED" as const,
      last_scheduled_for: new Date(
        NOW.getTime() - 10 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      last_finished_at: null,
      last_succeeded_at: null,
      attempts: 1,
      last_error: "boom",
      stale_running: 0,
    };

    const current = {
      ...retired,
      job: "driver-position-partitions",
      schedule: "10 4 * * *",
      last_status: "SUCCEEDED" as const,
      last_succeeded_at: new Date(NOW.getTime() - 60 * 60 * 1000).toISOString(),
      last_error: null,
    };

    expect(cronAlerts([retired, current], NOW)).toEqual([]);
  });

  it("still flags every job when the replica that answered schedules none", () => {
    // An HTTP-only replica (WORKERS_ENABLED=false) registers no cron job, so
    // every schedule reads null there — that is not "retired".
    const failed = {
      job: "driver-position-partitions",
      schedule: null,
      last_status: "FAILED" as const,
      last_scheduled_for: NOW.toISOString(),
      last_finished_at: NOW.toISOString(),
      last_succeeded_at: null,
      attempts: 1,
      last_error: "lock_timeout",
      stale_running: 0,
    };

    expect(cronAlerts([failed], NOW).map((entry) => entry.job)).toEqual([
      "driver-position-partitions",
    ]);
  });
});

describe("the tab's copy", () => {
  const view = readFileSync(
    resolve(process.cwd(), "src/features/system-metrics/index.tsx"),
    "utf8",
  );

  it("no longer claims the outbox card covers webhooks and integrations", () => {
    expect(view).not.toContain("Notificações, webhooks e integrações");
  });

  it("uses the rules for the badge, not the blind lag", () => {
    expect(view).toContain("queueStatus(");
  });
});
