import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The send action's wire (DLVP-BCAST-3, decision 6.8).
 *
 * The notice dialog keyed its sends, but the action only forwarded the key
 * when more than one driver was chosen — one recipient went out with no key,
 * and a retry after a lost answer wrote the message twice.
 */
vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));
vi.mock("@/lib/log-action-error", () => ({ logActionError: () => undefined }));

const KEY = "0192f7f0-0000-4000-8000-000000000001";

const requests: Array<{
  headers: Record<string, string>;
  body: Record<string, unknown>;
}> = [];

beforeEach(() => {
  requests.length = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      requests.push({
        headers: init.headers as Record<string, string>,
        body: JSON.parse(String(init.body)),
      });

      return new Response(
        JSON.stringify({
          message: "Mensagem enviada!",
          data: [],
          outcomes: [
            {
              driverId: "d1",
              driverName: "João",
              status: "SENT",
              messageId: "m1",
            },
          ],
          summary: { sent: 1, alreadySent: 0, skippedNoApp: 0 },
        }),
        { status: 201 },
      );
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendChatMessage", () => {
  it("sends the notice's key for a single chosen driver too", async () => {
    const { sendChatMessage } =
      await import("@/actions/chat/send-chat-message");

    await sendChatMessage({
      driverIds: ["d1"],
      kind: "TEXT",
      body: "Só para um",
      broadcastKey: KEY,
    });

    expect(requests[0].headers["Idempotency-Key"]).toBe(KEY);
  });

  it("sends the audience instead of a list, and hands back each outcome", async () => {
    const { sendChatMessage } =
      await import("@/actions/chat/send-chat-message");

    const result = await sendChatMessage({
      audience: "ALL_ACTIVE_WITH_APP",
      kind: "TEXT",
      body: "Para todos",
      broadcastKey: KEY,
    });

    expect(requests[0].body).toEqual({
      audience: "ALL_ACTIVE_WITH_APP",
      kind: "TEXT",
      body: "Para todos",
    });
    expect(result.data?.summary).toEqual({
      sent: 1,
      alreadySent: 0,
      skippedNoApp: 0,
    });
    expect(result.data?.outcomes[0].status).toBe("SENT");
  });
});
