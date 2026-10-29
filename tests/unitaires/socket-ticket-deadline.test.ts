// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * A socket ticket mint that never answers.
 *
 * The mint is a Server Action (a POST; the relay only carries GETs), and
 * Next 14 runs Server Actions one at a time: a navigation while the mint
 * waits in that queue drops it with a promise that never settles. The first
 * connection awaited it, so the whole tab stayed without realtime; a
 * handshake whose `auth` callback awaited it stalled the same way. Both now
 * give up after a deadline and go on as for any transient refusal.
 */
const mint = vi.hoisted(() => ({
  next: [] as Array<() => Promise<unknown>>,
  calls: 0,
}));

vi.mock("@/actions/session", () => ({
  mintSocketTicket: () => {
    mint.calls += 1;

    const answer = mint.next.shift();

    return answer ? answer() : new Promise(() => undefined);
  },
}));

const fake = vi.hoisted(() => {
  const socket = {
    connected: false,
    active: false,
    on: () => socket,
    once: () => socket,
    off: () => socket,
    emit: () => socket,
    connect: () => socket,
    disconnect: () => socket,
  };

  return {
    socket,
    io: vi.fn(
      (
        _url: string,
        options: { auth: (cb: (data: object) => void) => void },
      ) => {
        fake.auth = options.auth;
        return socket;
      },
    ),
    auth: null as null | ((cb: (data: object) => void) => void),
  };
});

vi.mock("socket.io-client", () => ({ io: fake.io }));

let socketModule: typeof import("@/socket");

beforeAll(async () => {
  process.env.PUBLIC_API_URL = "http://api.test";
  socketModule = await import("@/socket");
});

afterEach(() => {
  socketModule.disconnectSocket();
  fake.io.mockClear();
  fake.auth = null;
  mint.next = [];
  mint.calls = 0;
  vi.useRealTimers();
});

describe("a ticket mint dropped by the router", () => {
  it("does not keep the first connection waiting forever", async () => {
    vi.useFakeTimers();

    const connecting = socketModule.initializeSocket();

    await vi.advanceTimersByTimeAsync(9_000);
    expect(fake.io).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_500);

    await expect(connecting).resolves.toBe(fake.socket);
    expect(fake.io).toHaveBeenCalledTimes(1);
  });

  it("answers the handshake without a ticket instead of stalling it", async () => {
    // The first mint answers; the handshake's own (a reconnection) hangs.
    mint.next.push(async () => ({ ok: true, ticket: "first" }));

    await socketModule.initializeSocket();

    const spend = vi.fn();
    fake.auth!(spend);
    expect(spend).toHaveBeenCalledWith({ ticket: "first" });

    vi.useFakeTimers();

    const retry = vi.fn();
    fake.auth!(retry);

    await vi.advanceTimersByTimeAsync(10_500);

    // No ticket: refused, then retried with backoff by the socket itself.
    expect(retry).toHaveBeenCalledWith({});
    expect(mint.calls).toBe(2);
  });
});
