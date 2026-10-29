import { describe, expect, it, vi } from "vitest";

import { followReversal } from "@/features/deliveries/imports/reverse-dialog/follow-reversal";

/**
 * An undo of more than 500 deliveries runs in batches in the background
 * (the API answers 202); the dialog follows GET /import/get-import until the
 * record's `reversal.state` says how it ended. Undoing 2,000 deliveries in a
 * single transaction took 29 s and failed.
 */
const view = (state: string, removedDeliveries: number, extra = {}) => ({
  data: {
    status: state === "DONE" ? "REVERSED" : "COMPLETED",
    reversal: {
      state,
      removedDeliveries,
      removedRoutes: 0,
      keptDeliveries: [],
      keptRoutes: [],
      ...extra,
    },
  },
});

const base = {
  businessId: "biz-1",
  importId: "imp-1",
  intervalMs: 0,
  sleep: async () => {},
};

describe("followReversal", () => {
  it("reports progress and returns the result once the record is reversed", async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce(view("RUNNING", 500))
      .mockResolvedValueOnce(view("RUNNING", 1000))
      .mockResolvedValueOnce(
        view("DONE", 2100, {
          keptDeliveries: [
            { id: "d1", recipient_name: "Ana", reason: "Já comprovada" },
          ],
        }),
      );
    const progress: number[] = [];

    const outcome = await followReversal({
      ...base,
      read,
      onProgress: (removed) => progress.push(removed),
    });

    expect(progress).toEqual([500, 1000, 2100]);
    expect(outcome).toEqual({
      kind: "done",
      result: {
        removedDeliveries: 2100,
        removedRoutes: 0,
        keptDeliveries: [
          { id: "d1", recipient_name: "Ana", reason: "Já comprovada" },
        ],
        keptRoutes: [],
      },
    });
    expect(read.mock.calls[0][0]).toBe(
      "/api/relay/import/get-import/imp-1/business/biz-1",
    );
  });

  it("stops on an undo that was interrupted halfway", async () => {
    const read = vi.fn().mockResolvedValueOnce(view("INTERRUPTED", 1500));

    expect(await followReversal({ ...base, read })).toEqual({
      kind: "interrupted",
      removedDeliveries: 1500,
    });
  });

  it("keeps following through a failed read", async () => {
    const read = vi
      .fn()
      .mockRejectedValueOnce(new Error("502"))
      .mockResolvedValueOnce(view("DONE", 600));

    expect((await followReversal({ ...base, read })).kind).toBe("done");
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("hands the screen back after its time limit", async () => {
    const read = vi.fn().mockResolvedValue(view("RUNNING", 10));

    const outcome = await followReversal({
      ...base,
      read,
      timeoutMs: 0,
    });

    expect(outcome).toEqual({ kind: "gave-up" });
  });
});
