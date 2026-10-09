import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The web conversation pane under realtime pressure (CRIT-21) and with the
 * history narrowed to a route or delivery (decision 6.7).
 *
 * - A burst of driver messages on an open pane posted one mark-read each and
 *   refetched the badge each time.
 * - A reconnection re-read the pane by jumping to the end, which needs a
 *   thread: a driver's FIRST message sent during the drop never appeared.
 * - That reload marked the thread read with the tab in the background.
 * - The delivery chip was consumed by the first message.
 *
 * The socket and the server actions are fakes; the pane is the real one.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

const fake = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => void;

  const handlers = new Map<string, Set<Listener>>();
  const resync = new Set<() => void>();

  const socket = {
    connected: true,
    on(event: string, listener: Listener) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(listener);
      return socket;
    },
    off(event: string, listener?: Listener) {
      if (listener) handlers.get(event)?.delete(listener);
      else handlers.delete(event);
      return socket;
    },
    emit: () => socket,
  };

  return {
    socket,
    resync,
    fire(event: string, payload: unknown) {
      for (const listener of [...(handlers.get(event) ?? [])])
        listener(payload);
    },
    reconnect() {
      for (const listener of [...resync]) listener();
    },
    reset() {
      handlers.clear();
      resync.clear();
    },
  };
});

vi.mock("@/socket", () => ({
  initializeSocket: async () => fake.socket,
  getSocket: () => fake.socket,
  onRealtimeResync: (listener: () => void) => {
    fake.resync.add(listener);
    return () => {
      fake.resync.delete(listener);
    };
  },
}));

const actions = vi.hoisted(() => ({
  listChatMessages: vi.fn(),
  markChatRead: vi.fn(),
  sendChatMessage: vi.fn(),
  markTicketRead: vi.fn(),
}));

vi.mock("@/actions/chat/tickets", () => ({
  markTicketRead: (...args: unknown[]) => actions.markTicketRead(...args),
}));

vi.mock("@/actions/chat/list-chat-messages", () => ({
  listChatMessages: (...args: unknown[]) => actions.listChatMessages(...args),
}));
vi.mock("@/actions/chat/mark-chat-read", () => ({
  markChatRead: (...args: unknown[]) => actions.markChatRead(...args),
}));
vi.mock("@/actions/chat/send-chat-message", () => ({
  sendChatMessage: (...args: unknown[]) => actions.sendChatMessage(...args),
}));
vi.mock("@/actions/chat/get-chat-attachment-url", () => ({
  getChatAttachmentUrl: async () => ({ success: false, message: "" }),
}));

vi.mock("@/hooks/use-photo-upload", () => ({
  usePhotoUpload: () => ({ uploadPhotos: async () => [] }),
}));
vi.mock("@/features/deliveries/hooks/use-deliveries-business-id", () => ({
  useDeliveriesBusinessId: () => "b1",
}));
vi.mock("@/features/deliveries/deliveries/detail-dialog/lazy", () => ({
  DeliveryDetailDialog: () => null,
}));
vi.mock("@/features/deliveries/chat/image-viewer", () => ({
  ChatImageViewer: () => null,
}));
vi.mock("@/features/deliveries/chat/lib/use-chat-socket", () => ({
  useChatTypingEmitter: () => () => undefined,
  useChatRecordingPulse: () => () => undefined,
  useChatSubscription: () => undefined,
}));
vi.mock("@/features/deliveries/chat/lib/use-delivery-receipt", () => ({
  useDeliveryReceipt: () => () => undefined,
}));
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => createElement("img", props),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(() => undefined, {
    error: () => undefined,
    success: () => undefined,
    warning: () => undefined,
  }),
}));

// The composer is a keyboard and a microphone; what matters here is what it
// is handed (the chip) and what it sends.
const composer = vi.hoisted(() => ({
  onSend: null as null | ((submission: unknown) => void),
  chip: null as unknown,
}));

vi.mock("@/features/deliveries/chat/composer", () => ({
  ChatComposer: (props: {
    onSend: (s: unknown) => void;
    deliveryChip: unknown;
  }) => {
    composer.onSend = props.onSend;
    composer.chip = props.deliveryChip;
    return null;
  },
}));

const DRIVER_USER = "du1";

const page = (
  threadId: string | null,
  data: Array<Record<string, unknown>>,
) => ({
  success: true,
  message: "",
  data: {
    threadId,
    data,
    nextCursor: null,
    previousCursor: null,
    hasNewer: false,
    counterpartLastReadAt: null,
    counterpartDeliveredAt: null,
    driverUser: { id: DRIVER_USER, last_seen_at: null },
  },
});

let second = 0;

const message = (
  id: string,
  body: string,
  extra: Record<string, unknown> = {},
) => {
  second += 1;

  return {
    id,
    kind: "TEXT",
    body,
    attachment_url: null,
    duration_ms: null,
    deliveryId: null,
    routeId: null,
    broadcast_id: null,
    client_submission_id: null,
    threadId: "t1",
    senderId: DRIVER_USER,
    sender: { id: DRIVER_USER, name: "João" },
    delivery: null,
    route: null,
    created_at: new Date(Date.UTC(2026, 8, 28, 12, 0, second)).toISOString(),
    driver: { id: "d1", name: "João" },
    ...extra,
  };
};

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

let root: Root | null = null;
let host: HTMLDivElement | null = null;
let focused = true;

async function settle(ms = 30): Promise<void> {
  await act(async () => {
    await sleep(ms);
  });
}

async function openConversation(
  props: Record<string, unknown> = {},
): Promise<HTMLDivElement> {
  const { Conversation } =
    await import("@/features/deliveries/chat/conversation");

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(Conversation, {
          target: {
            driverId: "d1",
            driverName: "João",
            threadId: null,
            driverUser: null,
          },
          presence: null,
          isDriverTyping: false,
          isDriverRecording: false,
          myUserId: "staff",
          canWrite: true,
          isReadOnly: false,
          initialDeliveryChip: null,
          focusRequest: null,
          onBack: () => undefined,
          onThreadResolved: () => undefined,
          ...props,
        } as never),
      ),
    );
  });

  await settle();

  return host;
}

beforeEach(() => {
  fake.reset();
  focused = true;

  vi.spyOn(document, "hasFocus").mockImplementation(() => focused);

  // jsdom-like environments do not lay out; the pane only reads these.
  Element.prototype.scrollIntoView = () => undefined;

  actions.listChatMessages.mockReset();
  actions.markChatRead.mockReset();
  actions.sendChatMessage.mockReset();
  actions.markTicketRead.mockReset();

  actions.markTicketRead.mockResolvedValue({
    success: true,
    message: "",
    data: { data: { last_read_at: new Date().toISOString() } },
  });

  actions.markChatRead.mockResolvedValue({
    success: true,
    message: "",
    data: { last_read_at: new Date().toISOString() },
  });
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();

  root = null;
  host = null;

  vi.restoreAllMocks();
});

describe("a burst of driver messages on an open pane", () => {
  it("sends one mark-read now and one with the newest stamp, not one each", async () => {
    actions.listChatMessages.mockResolvedValue(
      page("t1", [message("m0", "oi")]),
    );

    await openConversation();

    expect(actions.markChatRead).toHaveBeenCalledTimes(1);

    const burst = Array.from({ length: 20 }, (_, index) =>
      message(`b${index}`, `mensagem ${index}`),
    );

    await act(async () => {
      for (const payload of burst) fake.fire("chatMessage", payload);
    });

    await settle(900);

    // Before: 21 POSTs (the open plus one per message).
    expect(actions.markChatRead).toHaveBeenCalledTimes(2);
    expect(actions.markChatRead.mock.calls[1][0]).toMatchObject({
      threadId: "t1",
      readAt: burst[19].created_at,
    });
  });
});

describe("a reconnection", () => {
  it("brings the driver's first message into a conversation that had not started", async () => {
    actions.listChatMessages.mockResolvedValueOnce(page(null, []));

    const pane = await openConversation();

    expect(pane.textContent).toContain("Diga olá");

    // Sent while the tab was reconnecting: no socket event ever arrived.
    actions.listChatMessages.mockResolvedValueOnce(
      page("t1", [message("m1", "Cheguei no cliente")]),
    );

    await act(async () => {
      fake.reconnect();
    });

    await settle(100);

    expect(actions.listChatMessages).toHaveBeenCalledTimes(2);
    expect(actions.listChatMessages.mock.calls[1][0]).toMatchObject({
      driverId: "d1",
    });
    expect(pane.textContent).toContain("Cheguei no cliente");
  });

  it("does not mark the thread read while the tab is in the background", async () => {
    actions.listChatMessages.mockResolvedValueOnce(
      page("t1", [message("m0", "oi")]),
    );

    await openConversation({
      target: {
        driverId: "d1",
        driverName: "João",
        threadId: "t1",
        driverUser: null,
      },
    });

    await settle(900);
    expect(actions.markChatRead).toHaveBeenCalledTimes(1);

    focused = false;

    actions.listChatMessages.mockResolvedValueOnce(
      page("t1", [message("m0", "oi"), message("m2", "enquanto dormia")]),
    );

    await act(async () => {
      fake.reconnect();
    });

    await settle(900);

    // Before: the reload marked it read on the spot, and the driver saw the
    // blue check with nobody at the screen.
    expect(actions.markChatRead).toHaveBeenCalledTimes(1);

    focused = true;

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    await settle();

    expect(actions.markChatRead).toHaveBeenCalledTimes(2);
  });
});

describe("a history narrowed to a route (6.7)", () => {
  it("asks for the route's messages, keeps others out, and never marks the thread read", async () => {
    actions.listChatMessages.mockResolvedValue(
      page("t1", [message("m1", "na rota", { routeId: "r1" })]),
    );

    const onHistoryFilterChange = vi.fn();

    const pane = await openConversation({
      historyFilter: { kind: "route", id: "r1", label: "Rota 12" },
      onHistoryFilterChange,
    });

    expect(actions.listChatMessages.mock.calls[0][0]).toMatchObject({
      driverId: "d1",
      routeId: "r1",
    });

    expect(pane.textContent).toContain("Só as mensagens da Rota 12");

    await act(async () => {
      fake.fire("chatMessage", message("m2", "outra rota", { routeId: "r2" }));
      fake.fire("chatMessage", message("m3", "mesma rota", { routeId: "r1" }));
    });

    await settle(900);

    expect(pane.textContent).not.toContain("outra rota");
    expect(pane.textContent).toContain("mesma rota");

    // The cursor covers the whole thread; a filtered window is not it.
    expect(actions.markChatRead).not.toHaveBeenCalled();

    const clear = [...pane.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Ver toda a conversa"),
    )!;

    await act(async () => {
      clear.click();
    });

    expect(onHistoryFilterChange).toHaveBeenCalledWith(null);
  });
});

describe("a ticket's conversation (decision 14.5)", () => {
  it("asks for the ticket's messages, keeps other tickets out, marks the TICKET read and writes into it", async () => {
    actions.listChatMessages.mockResolvedValue(
      page("t1", [message("m1", "no atendimento", { ticketId: "tk1" })]),
    );

    actions.sendChatMessage.mockImplementation(
      async (request: Record<string, unknown>) => ({
        success: true,
        message: "",
        data: {
          data: [
            {
              ...message(
                `s-${request.clientSubmissionId}`,
                String(request.body),
                { ticketId: "tk1" },
              ),
              senderId: "staff",
              client_submission_id: request.clientSubmissionId,
            },
          ],
          outcomes: [],
          summary: null,
        },
      }),
    );

    const pane = await openConversation({
      historyFilter: { kind: "ticket", id: "tk1", label: "#128" },
      onHistoryFilterChange: () => undefined,
    });

    expect(actions.listChatMessages.mock.calls[0][0]).toMatchObject({
      driverId: "d1",
      ticketId: "tk1",
    });
    expect(pane.textContent).toContain("Só as mensagens do atendimento #128");

    await act(async () => {
      fake.fire(
        "chatMessage",
        message("m2", "outro assunto", { ticketId: "tk2" }),
      );
      fake.fire(
        "chatMessage",
        message("m3", "mesmo assunto", { ticketId: "tk1" }),
      );
    });

    await settle(900);

    expect(pane.textContent).not.toContain("outro assunto");
    expect(pane.textContent).toContain("mesmo assunto");

    // The ticket's cursor moves; the thread's (the whole conversation) never.
    expect(actions.markChatRead).not.toHaveBeenCalled();
    expect(actions.markTicketRead).toHaveBeenCalled();
    expect(
      actions.markTicketRead.mock.calls.every(
        ([request]) => request.ticketId === "tk1",
      ),
    ).toBe(true);

    await act(async () => {
      composer.onSend!({ body: "Pode seguir", imageFiles: [], audio: null });
    });

    await settle(50);

    expect(actions.sendChatMessage.mock.calls[0][0]).toMatchObject({
      driverIds: ["d1"],
      ticketId: "tk1",
      body: "Pode seguir",
    });
  });
});

describe("the delivery chip", () => {
  it("stays on for the follow-up messages until the reader removes it", async () => {
    actions.listChatMessages.mockResolvedValue(page("t1", []));

    actions.sendChatMessage.mockImplementation(
      async (request: Record<string, unknown>) => ({
        success: true,
        message: "",
        data: {
          data: [
            {
              ...message(
                `s-${request.clientSubmissionId}`,
                String(request.body),
              ),
              senderId: "staff",
              client_submission_id: request.clientSubmissionId,
            },
          ],
          outcomes: [],
          summary: null,
        },
      }),
    );

    await openConversation({
      initialDeliveryChip: { id: "e1", recipient_name: "Padaria" },
    });

    for (const body of ["Chegou?", "E a nota?"]) {
      await act(async () => {
        composer.onSend!({ body, imageFiles: [], audio: null });
      });

      await settle(50);
    }

    // Before: the first send consumed the chip and the second went unlinked.
    expect(
      actions.sendChatMessage.mock.calls.map(([request]) => request.deliveryId),
    ).toEqual(["e1", "e1"]);
    expect(composer.chip).toEqual({ id: "e1", recipient_name: "Padaria" });
  });
});
