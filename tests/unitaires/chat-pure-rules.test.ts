import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createReadThrottle,
  furthest,
  type ReadRequest,
} from "@/features/deliveries/chat/lib/read-throttle";
import { describeBroadcastOutcome } from "@/features/deliveries/chat/lib/broadcast-outcome";
import {
  buildChatSearchParams,
  readChatLink,
  withoutChatLink,
} from "@/features/deliveries/chat/lib/chat-link";

/**
 * The web chat's pure rules for decisions 6.7 and 6.8, and the mark-read
 * burst CRIT-21 asked to measure.
 */
describe("read throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const stamp = (second: number) =>
    new Date(Date.UTC(2026, 8, 28, 12, 0, second)).toISOString();

  it("turns a burst of twenty reads into one now and one with the newest stamp", () => {
    const sent: ReadRequest[] = [];
    const throttle = createReadThrottle(800, (read) => sent.push(read));

    for (let second = 0; second < 20; second += 1) {
      throttle.request("t1", stamp(second));
    }

    expect(sent).toEqual([{ threadId: "t1", readAt: stamp(0) }]);

    vi.advanceTimersByTime(800);

    expect(sent).toEqual([
      { threadId: "t1", readAt: stamp(0) },
      { threadId: "t1", readAt: stamp(19) },
    ]);

    // Quiet afterwards: nothing more goes out.
    vi.advanceTimersByTime(5_000);
    expect(sent).toHaveLength(2);
  });

  it("never lets a late, older stamp pull the coalesced one back", () => {
    const sent: ReadRequest[] = [];
    const throttle = createReadThrottle(800, (read) => sent.push(read));

    throttle.request("t1", stamp(1));
    throttle.request("t1", stamp(9));
    throttle.request("t1", stamp(4));

    vi.advanceTimersByTime(800);

    expect(sent.at(-1)).toEqual({ threadId: "t1", readAt: stamp(9) });
    expect(furthest(stamp(3), null)).toBeNull();
  });

  it("sends what is waiting when the pane goes away, and nothing after a cancel", () => {
    const sent: ReadRequest[] = [];
    const throttle = createReadThrottle(800, (read) => sent.push(read));

    throttle.request("t1", stamp(1));
    throttle.request("t1", stamp(2));
    throttle.flush();

    expect(sent.map((read) => read.readAt)).toEqual([stamp(1), stamp(2)]);

    throttle.request("t1", stamp(3));
    throttle.request("t1", stamp(4));
    throttle.cancel();
    vi.advanceTimersByTime(2_000);

    expect(sent.map((read) => read.readAt)).toEqual([
      stamp(1),
      stamp(2),
      stamp(3),
    ]);
  });
});

describe("mass notice outcome", () => {
  it("does not count drivers without the app as reached", () => {
    expect(
      describeBroadcastOutcome({ sent: 3, alreadySent: 0, skippedNoApp: 2 }, 3),
    ).toEqual({
      tone: "warning",
      message:
        "Aviso enviado para 3 motoristas. 2 motoristas sem o aplicativo ficaram de fora.",
    });
  });

  it("says a retry reached nobody new instead of 'enviado' again", () => {
    expect(
      describeBroadcastOutcome({ sent: 0, alreadySent: 1, skippedNoApp: 0 }, 1),
    ).toEqual({
      tone: "success",
      message: "1 motorista já tinha recebido este aviso.",
    });
  });

  it("is an error when nobody could receive it", () => {
    expect(
      describeBroadcastOutcome({ sent: 0, alreadySent: 0, skippedNoApp: 1 }, 0)
        .tone,
    ).toBe("error");
  });

  it("falls back to the messages answered by an older API", () => {
    expect(describeBroadcastOutcome(null, 1).message).toBe(
      "Aviso enviado para 1 motorista.",
    );
  });
});

describe("chat link (delivery and route details)", () => {
  it("round-trips a route history filter and keeps the MASTER's company", () => {
    const params = buildChatSearchParams("businessId=b1&tab=routes&page=3", {
      driver: { id: "d1", name: "João" },
      route: { id: "r1", code: 12 },
      filter: "route",
    });

    expect(params.get("businessId")).toBe("b1");
    // The Torre's Atendimentos view (meeting of 14/10/2026); the Rotas
    // page's own params stay behind.
    expect(params.get("view")).toBe("tickets");
    expect(params.get("tab")).toBeNull();
    expect(params.get("page")).toBeNull();

    expect(readChatLink(params)).toEqual({
      driverId: "d1",
      driverName: "João",
      chip: null,
      filter: { kind: "route", id: "r1", label: "Rota 12" },
    });

    expect([...withoutChatLink(params).keys()].sort()).toEqual([
      "businessId",
      "view",
    ]);
  });

  it("opens on a delivery with its chip, filtered or not", () => {
    const chipOnly = buildChatSearchParams("", {
      driver: { id: "d1", name: "João" },
      delivery: { id: "e1", recipient_name: "Padaria" },
    });

    expect(readChatLink(chipOnly)).toMatchObject({
      chip: { id: "e1", recipient_name: "Padaria" },
      filter: null,
    });

    const filtered = buildChatSearchParams("", {
      driver: { id: "d1", name: "João" },
      delivery: { id: "e1", recipient_name: "Padaria" },
      filter: "delivery",
    });

    expect(readChatLink(filtered)?.filter).toEqual({
      kind: "delivery",
      id: "e1",
      label: "Padaria",
    });

    // A filter without what it filters by is not a filter.
    expect(
      buildChatSearchParams("", {
        driver: { id: "d1", name: "João" },
        filter: "route",
      }).get("chatFilter"),
    ).toBeNull();
  });

  it("reads the link the delivery detail has always sent", () => {
    const legacy = new URLSearchParams(
      "tab=chat&chatDriver=d1&chatDriverName=Jo%C3%A3o&chatDelivery=e1&chatRecipient=Padaria",
    );

    expect(readChatLink(legacy)).toEqual({
      driverId: "d1",
      driverName: "João",
      chip: { id: "e1", recipient_name: "Padaria" },
      filter: null,
    });
  });
});
