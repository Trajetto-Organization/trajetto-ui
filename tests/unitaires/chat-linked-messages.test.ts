import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * "Conversas" in a delivery's or a route's detail (decision 6.7): the one
 * driver thread, narrowed to what was said about it.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

const listChatMessages = vi.hoisted(() => vi.fn());

vi.mock("@/actions/chat/list-chat-messages", () => ({
  listChatMessages: (...args: unknown[]) => listChatMessages(...args),
}));

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = null;
  host = null;
  listChatMessages.mockReset();
});

const message = (id: string, body: string, minute: number) => ({
  id,
  kind: "TEXT",
  body,
  attachment_url: null,
  duration_ms: null,
  deliveryId: null,
  routeId: "r1",
  broadcast_id: null,
  client_submission_id: null,
  threadId: "t1",
  senderId: "u1",
  sender: { id: "u1", name: "João" },
  delivery: null,
  route: { id: "r1", code: 12, name: null },
  created_at: new Date(Date.UTC(2026, 8, 28, 12, minute)).toISOString(),
});

describe("ChatLinkedMessages", () => {
  it("asks for the route's messages of the driver's thread and reads them in order", async () => {
    listChatMessages.mockResolvedValue({
      success: true,
      message: "",
      data: {
        threadId: "t1",
        // Newest first, as the API answers.
        data: [message("m2", "Saindo do CD", 5), message("m1", "Bom dia", 1)],
        nextCursor: { created_at: "x", id: "m0" },
        previousCursor: null,
        hasNewer: false,
        counterpartLastReadAt: null,
        counterpartDeliveredAt: null,
        driverUser: null,
      },
    });

    const { ChatLinkedMessages } =
      await import("@/features/deliveries/chat/linked-messages");

    const onOpenChat = vi.fn();

    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root!.render(
        createElement(
          QueryClientProvider,
          {
            client: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
          },
          createElement(ChatLinkedMessages, {
            driver: { id: "d1", name: "João" },
            filter: { kind: "route", id: "r1", label: "Rota 12" },
            onOpenChat,
          }),
        ),
      );
    });

    await act(async () => {
      await new Promise((done) => setTimeout(done, 30));
    });

    expect(listChatMessages).toHaveBeenCalledWith(
      expect.objectContaining({ driverId: "d1", routeId: "r1", limit: 5 }),
    );

    const text = host.textContent ?? "";

    expect(text.indexOf("Bom dia")).toBeLessThan(text.indexOf("Saindo do CD"));
    expect(text).toContain("Mensagens anteriores no chat.");

    const open = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Abrir no chat",
    )!;

    await act(async () => {
      open.click();
    });

    expect(onOpenChat).toHaveBeenCalledTimes(1);
  });
});
