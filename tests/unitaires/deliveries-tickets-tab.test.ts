import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The deliveries tab that holds the support tickets (decision 14.5, design
 * §6.1): named "Atendimentos" (the URL keeps tab=chat, so saved links still
 * open it), badged with the unread open tickets, and with a red dot while a
 * driver waits for the tower's authorization.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

const state = vi.hoisted(() => ({
  counts: null as null | {
    open: number;
    unassigned: number;
    mine: number;
    pendingAuthorization: number;
    unreadOpen: number;
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("tab=deliveries"),
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/dashboard/deliveries",
}));

vi.mock("@/store/auth-store", () => ({
  useAuthStore: (selector: (value: Record<string, unknown>) => unknown) =>
    selector({ role: null, permissions: [], enabledModules: ["DELIVERIES"] }),
}));

vi.mock("@/features/deliveries/chat/lib/use-chat-unread", () => ({
  useTicketsSummary: () => state.counts,
  useChatUnreadCount: () => state.counts?.unreadOpen ?? 0,
}));

import { DELIVERY_TABS } from "@/features/deliveries/lib/tabs";
import { DeliveriesTabs } from "@/features/deliveries/tabs";

let root: Root | null = null;

beforeEach(() => {
  state.counts = null;
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function renderTabs(): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(createElement(DeliveriesTabs, { activeTab: "deliveries" }));
  });

  return host;
}

function ticketsTab(host: HTMLElement): HTMLAnchorElement | undefined {
  return [...host.querySelectorAll<HTMLAnchorElement>("a")].find((link) =>
    link.getAttribute("href")?.includes("tab=chat"),
  );
}

describe("the Atendimentos tab", () => {
  it("is named Atendimentos and keeps tab=chat in the URL", async () => {
    expect(DELIVERY_TABS.find((tab) => tab.value === "chat")?.label).toBe(
      "Atendimentos",
    );

    const host = await renderTabs();
    const tab = ticketsTab(host);

    expect(tab?.textContent).toContain("Atendimentos");
    expect(tab?.textContent).not.toMatch(/\bChat\b/);
  });

  it("badges unread open tickets, with no dot while nothing waits for authorization", async () => {
    state.counts = {
      open: 3,
      unassigned: 0,
      mine: 1,
      pendingAuthorization: 0,
      unreadOpen: 2,
    };

    const host = await renderTabs();
    const tab = ticketsTab(host)!;

    expect(tab.textContent).toContain("2");
    expect(tab.querySelector("[data-authorization-dot]")).toBeNull();
  });

  it("shows the red dot while a request waits for the tower", async () => {
    state.counts = {
      open: 1,
      unassigned: 0,
      mine: 0,
      pendingAuthorization: 1,
      unreadOpen: 0,
    };

    const host = await renderTabs();
    const dot = ticketsTab(host)!.querySelector("[data-authorization-dot]");

    expect(dot).not.toBeNull();
    expect(dot!.getAttribute("aria-label")).toBe(
      "1 pedido aguardando autorização",
    );
  });
});
