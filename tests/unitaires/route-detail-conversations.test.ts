import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubRelay } from "./helpers/relay-fetch";

/**
 * "Conversas" on the route's page (decision 6.7; the page replaced the
 * detail dialog in decision 14.7): the driver's one thread,
 * narrowed to what was said about THIS route, and the way into the chat
 * filtered the same way — in the area (/admin or /dashboard) the dispatcher
 * is in, keeping the MASTER's company.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

const BUSINESS = "018f0000-0000-7000-8000-00000000000b";
const ROUTE = "018f0000-0000-7000-8000-0000000000a7";
const DRIVER = "018f0000-0000-7000-8000-0000000000d1";

const state = vi.hoisted(() => ({
  pathname: "/admin/routes",
  search: "businessId=018f0000-0000-7000-8000-00000000000b&page=2",
  role: "MASTER",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(state.search),
  useRouter: () => ({ push: state.push, refresh: () => {} }),
  usePathname: () => state.pathname,
}));

vi.mock("@/store/auth-store", () => {
  // The permission hook reads the whole store; the components pick a field.
  const store = () => ({
    role: state.role,
    permissions: [],
    isLoaded: true,
    loadAuth: () => {},
  });

  return {
    useAuthStore: (selector?: (value: ReturnType<typeof store>) => unknown) =>
      selector ? selector(store()) : store(),
  };
});

// Opening a ticket stays a Server Action; the lists are relay reads
// (lib/chat-reads), answered below by API path.
vi.mock("@/actions/chat/tickets", () => ({
  openTicket: vi.fn(),
}));

import { RouteConversations } from "@/features/routes/detail-page/route-conversations";

let root: Root | null = null;
let relay: ReturnType<typeof stubRelay>;

beforeEach(() => {
  state.pathname = `/admin/routes/${ROUTE}`;
  state.search = `businessId=${BUSINESS}&page=2`;
  state.role = "MASTER";
  state.push.mockReset();

  relay = stubRelay({
    "/chat/tickets": () => ({
      data: [
        {
          id: "tk1",
          number: 128,
          subject: "Rota 12",
          kind: "ROUTE",
          status: "OPEN",
          assignee: null,
        },
      ],
    }),
    "/chat/list-messages": () => ({
      threadId: "t1",
      data: [
        {
          id: "m1",
          kind: "TEXT",
          body: "Saindo do CD",
          sender: { id: "u1", name: "João" },
          created_at: "2026-09-17T11:00:00.000Z",
        },
      ],
      nextCursor: null,
    }),
  });
});

/** The query of the one read made to an API path. */
function askedOf(path: string): URLSearchParams {
  const calls = relay.callsTo(path);

  expect(calls, `${path} não foi pedido`).toHaveLength(1);

  return calls[0].query;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

async function settle(times = 5): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function openDetail(): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    root!.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(RouteConversations, {
          businessId: BUSINESS,
          route: { id: ROUTE, code: 12, driver: { id: DRIVER, name: "João" } },
        }),
      ),
    );
  });

  await settle();
}

describe("Conversas in the route's detail", () => {
  it("lists what was said about this route in the driver's thread", async () => {
    // Red before: the detail had no Conversas at all.
    await openDetail();

    const section = document.querySelector('section[aria-label="Conversas"]');

    expect(section).not.toBeNull();
    expect(section!.textContent).toContain("Saindo do CD");

    const asked = askedOf("/chat/list-messages");

    expect(asked.get("driverId")).toBe(DRIVER);
    expect(asked.get("routeId")).toBe(ROUTE);
    expect(asked.get("businessId")).toBe(BUSINESS);
  });

  it("opens the chat on this route, in the admin area, keeping the company", async () => {
    await openDetail();

    const open = [...document.querySelectorAll("button")].find(
      (node) => node.textContent?.trim() === "Abrir no chat",
    )!;

    await act(async () => open.click());

    expect(state.push).toHaveBeenCalledTimes(1);

    const [target] = state.push.mock.calls[0] as [string];
    const [path, query] = target.split("?");
    const params = new URLSearchParams(query);

    // The Torre's Atendimentos (meeting of 14/10/2026).
    expect(path).toBe("/admin/control-tower");
    expect(params.get("businessId")).toBe(BUSINESS);
    expect(params.get("view")).toBe("tickets");
    expect(params.get("tab")).toBeNull();
    expect(params.get("page")).toBeNull();
    expect(params.get("chatDriver")).toBe(DRIVER);
    expect(params.get("chatRoute")).toBe(ROUTE);
    expect(params.get("chatRouteCode")).toBe("12");
    expect(params.get("chatFilter")).toBe("route");
  });

  it("answers a company user from the session, in the dashboard area", async () => {
    state.role = "BUSINESS_ADMIN";
    state.pathname = `/dashboard/routes/${ROUTE}`;
    state.search = "";

    await openDetail();

    const asked = askedOf("/chat/list-messages");

    expect(asked.get("businessId")).toBeNull();
    expect(asked.get("routeId")).toBe(ROUTE);

    const open = [...document.querySelectorAll("button")].find(
      (node) => node.textContent?.trim() === "Abrir no chat",
    )!;

    await act(async () => open.click());

    expect((state.push.mock.calls[0] as [string])[0]).toMatch(
      /^\/dashboard\/control-tower\?/,
    );
  });
});

describe("Atendimentos in the route's detail (decision 14.5, design §6.4)", () => {
  it("lists the route's tickets and opens one in the Torre, keeping the company", async () => {
    await openDetail();

    const section = document.querySelector(
      'section[aria-label="Atendimentos"]',
    );

    expect(section).not.toBeNull();
    expect(section!.textContent).toContain("#128");
    const asked = askedOf("/chat/tickets");

    expect(asked.get("routeId")).toBe(ROUTE);
    expect(asked.get("businessId")).toBe(BUSINESS);

    const view = [...section!.querySelectorAll("button")].find(
      (node) => node.textContent?.trim() === "Ver conversa",
    )!;

    await act(async () => view.click());

    const [target] = state.push.mock.calls[0] as [string];
    const [path, query] = target.split("?");
    const params = new URLSearchParams(query);

    // The Torre's Atendimentos (meeting of 14/10/2026).
    expect(path).toBe("/admin/control-tower");
    expect(params.get("businessId")).toBe(BUSINESS);
    expect(params.get("view")).toBe("tickets");
    expect(params.get("tab")).toBeNull();
    expect(params.get("ticket")).toBe("tk1");
    expect(params.get("page")).toBeNull();
  });
});
