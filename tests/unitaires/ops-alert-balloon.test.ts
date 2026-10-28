import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubRelay } from "./helpers/relay-fetch";

/**
 * The floating alert (decision 14.6) mounted for real: a socket event pops
 * the card, the card leads to the ticket, closing the ticket elsewhere takes
 * the card away, and someone outside the deliveries never sees it.
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

  const socket = {
    on(event: string, listener: Listener) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(listener);
      return socket;
    },
    off(event: string, listener?: Listener) {
      if (listener) handlers.get(event)?.delete(listener);
      return socket;
    },
  };

  return {
    socket,
    fire(event: string, payload: unknown) {
      for (const listener of [...(handlers.get(event) ?? [])])
        listener(payload);
    },
    reset: () => handlers.clear(),
  };
});

vi.mock("@/socket", () => ({
  initializeSocket: async () => fake.socket,
  getSocket: () => fake.socket,
  onRealtimeResync: () => () => undefined,
}));

const state = vi.hoisted(() => ({
  canUseChat: true,
  push: vi.fn(),
  updateSound: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: state.push }),
}));

vi.mock("@/features/deliveries/chat/lib/use-chat-unread", () => ({
  useChatAccess: () => ({
    canUseChat: state.canUseChat,
    isSupportReadOnly: false,
  }),
  useTicketsSummary: () =>
    state.canUseChat
      ? {
          open: 2,
          unassigned: 1,
          mine: 0,
          pendingAuthorization: 1,
          unreadOpen: 0,
        }
      : null,
}));

// Saving the switch stays a Server Action; reading it is a relay GET of
// /notification/preferences (ops-alert/sound-preference).
vi.mock("@/actions/chat/tickets", () => ({
  updateOpsAlertSound: (...args: unknown[]) => state.updateSound(...args),
}));

vi.mock("@/store/auth-store", () => ({
  useAuthStore: (select: (value: { id: string }) => unknown) =>
    select({ id: "me" }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(() => undefined, {
    error: () => undefined,
    success: () => undefined,
  }),
}));

let root: Root | null = null;
let host: HTMLDivElement | null = null;

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function mount(): Promise<HTMLDivElement> {
  const { OpsAlertBalloon } =
    await import("@/features/deliveries/ops-alert/ops-alert-balloon");

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
        createElement(OpsAlertBalloon),
      ),
    );
  });

  await act(async () => {
    await sleep(20);
  });

  return host;
}

const opened = (version: number, type = "ticket.opened") => ({
  type,
  actor: { id: "driver-user", name: "João" },
  alert: {
    reason: "AUTHORIZATION",
    occurrenceTypeName: "Cliente ausente",
    recipientName: "Mercado Sol",
    driverName: "João",
  },
  ticket: {
    id: "tk1",
    number: 128,
    kind: "OCCURRENCE",
    status: type === "ticket.closed" ? "CLOSED" : "OPEN",
    subject: "Cliente ausente — Mercado Sol",
    version,
    driver: { id: "d1", name: "João" },
    occurrence: {
      id: "o1",
      typeName: "Cliente ausente",
      authorization_status: "PENDING",
      escalates_at: null,
    },
    assignee: null,
  },
});

beforeEach(() => {
  fake.reset();
  state.canUseChat = true;
  state.push.mockReset();
  state.updateSound.mockReset();

  // jsdom has no audio: the element exists, playing is refused.
  vi.stubGlobal(
    "Audio",
    class {
      currentTime = 0;
      play() {
        return Promise.resolve();
      }
    },
  );

  stubRelay({
    "/notification/preferences": () => ({ opsAlert: { sound: false } }),
  });
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = null;
  host = null;
  vi.unstubAllGlobals();
});

describe("the operations alert balloon", () => {
  it("pops the authorization request, leads to the ticket, and leaves when the ticket closes", async () => {
    const pane = await mount();

    // The persistent pill comes from the server's counts.
    expect(pane.textContent).toContain("1 sem atendente · 1 autorização");

    await act(async () => {
      fake.fire("supportTicket", opened(1));
    });

    expect(pane.textContent).toContain("Pedido de autorização");
    expect(pane.textContent).toContain("Cliente ausente — Mercado Sol · João");

    // The same event delivered twice (reconnection, two replicas): one card.
    await act(async () => {
      fake.fire("supportTicket", opened(1));
    });

    expect(pane.textContent?.match(/Pedido de autorização/g)).toHaveLength(1);

    const region = pane.querySelector('[aria-label="Alertas da operação"]');

    expect(region?.getAttribute("aria-live")).toBe("assertive");

    // Closed on another screen: the card goes.
    await act(async () => {
      fake.fire("supportTicket", opened(2, "ticket.closed"));
    });

    expect(pane.textContent).not.toContain("Pedido de autorização");

    // An event older than the close arriving late does not bring it back.
    await act(async () => {
      fake.fire("supportTicket", opened(1));
    });

    expect(pane.textContent).not.toContain("Pedido de autorização");

    await act(async () => {
      fake.fire("supportTicket", {
        ...opened(3),
        ticket: { ...opened(3).ticket, id: "tk2", number: 129 },
      });
    });

    const card = [...pane.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Pedido de autorização"),
    )!;

    await act(async () => {
      card.click();
    });

    // The tickets are the Torre's Atendimentos (meeting of 14/10/2026).
    expect(state.push).toHaveBeenCalledWith(
      "/dashboard/control-tower?view=tickets&ticket=tk2",
    );
    expect(pane.textContent).not.toContain("Pedido de autorização");
  });

  it("toggles the person's sound from the pill", async () => {
    state.updateSound.mockResolvedValue({
      success: true,
      message: "Som dos alertas ligado.",
      data: { sound: true },
    });

    const pane = await mount();

    const speaker = pane.querySelector(
      '[aria-label="Ligar o som dos alertas"]',
    ) as HTMLButtonElement;

    expect(speaker).not.toBeNull();

    await act(async () => {
      speaker.click();
      await sleep(10);
    });

    expect(state.updateSound).toHaveBeenCalledWith(true);
    expect(
      pane.querySelector('[aria-label="Desligar o som dos alertas"]'),
    ).not.toBeNull();
  });

  it("does not exist for someone outside the deliveries", async () => {
    state.canUseChat = false;

    const pane = await mount();

    await act(async () => {
      fake.fire("supportTicket", opened(1));
    });

    expect(pane.querySelector('[data-testid="ops-alert-balloon"]')).toBeNull();
  });
});
