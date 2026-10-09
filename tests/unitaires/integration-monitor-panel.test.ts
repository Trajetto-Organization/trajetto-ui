import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * Monitor de envios (Entregas 15; DLVB-28, DLVB-29, DLVB-31).
 *
 * The "Na fila" chip asked for PENDING while the card counted PENDING and
 * PROCESSING; the cards covered 24 hours while the lists covered the whole
 * retained month; a send whose attempt died read "Enviando" forever; and the
 * p95 never said what it measures.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/dashboard/integrations",
  useSearchParams: () => new URLSearchParams(),
}));

const api = vi.hoisted(() => ({
  calls: [] as Array<{ status?: string; window?: string }>,

  // What the next answers report as the list total (DLVB-30).
  total: 2,
  totalCapped: undefined as boolean | undefined,
}));

const HOUR = 60 * 60 * 1000;

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

vi.mock("@/actions/integration", () => ({
  listWebhookDeliveries: async (
    _page: number,
    _size: number,
    filters: { status?: string; window?: string },
  ) => {
    api.calls.push({ status: filters.status, window: filters.window });

    return {
      success: true,
      message: "",
      data: {
        data: [
          {
            id: "row-stalled",
            topic: "delivery.created",
            status: "PROCESSING",
            attempts: 2,
            response_status: null,
            response_body: null,
            lastError: null,
            latency_ms: null,
            availableAt: new Date(Date.now() - HOUR).toISOString(),
            leaseExpiresAt: new Date(Date.now() - HOUR).toISOString(),
            deliveredAt: null,
            created_at: new Date(Date.now() - 2 * HOUR).toISOString(),
            endpoint: {
              id: "wh-1",
              name: "ERP",
              url: "https://erp.exemplo.com.br",
            },
          },
          {
            id: "row-sending",
            topic: "delivery.delivered",
            status: "PROCESSING",
            attempts: 1,
            response_status: null,
            response_body: null,
            lastError: null,
            latency_ms: null,
            availableAt: new Date(Date.now() + 60_000).toISOString(),
            leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
            deliveredAt: null,
            created_at: new Date(Date.now() - 60_000).toISOString(),
            endpoint: {
              id: "wh-1",
              name: "ERP",
              url: "https://erp.exemplo.com.br",
            },
          },
        ],
        total: api.total,
        meta: {
          window: filters.window ?? "24h",
          totalCapped: api.totalCapped,
          delivered: 3,
          failed: 1,
          pending: 2,
          p95LatencyMs: 120,
        },
      },
    };
  },
  resendWebhookDelivery: async () => ({ success: true, message: "" }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useAuthStore } from "@/store/auth-store";
import { MonitorPanel } from "@/features/integrations/monitor/panel";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

beforeEach(() => {
  api.calls.length = 0;
  api.total = 2;
  api.totalCapped = undefined;
  localStorage.clear();
  useAuthStore.setState({
    role: "BUSINESS_ADMIN",
    isLoaded: true,
    permissions: [],
  } as never);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function settle(times = 4): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }
}

async function mount(): Promise<HTMLElement> {
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
        createElement(MonitorPanel, {
          businessId: "018f0000-0000-7000-8000-00000000000b",
        }),
      ),
    );
  });

  await settle();

  return host;
}

async function chip(label: string): Promise<void> {
  const button = [...document.querySelectorAll("button[aria-pressed]")].find(
    (candidate) => (candidate.textContent ?? "").trim().startsWith(label),
  ) as HTMLButtonElement | undefined;

  expect(button, `chip "${label}" não encontrado`).toBeDefined();

  await act(async () => button!.click());
  await settle();
}

describe("the Na fila chip (DLVB-28)", () => {
  it("lists the whole queue the card counts: PENDING and PROCESSING", async () => {
    await mount();

    await chip("Na fila");

    expect(api.calls.at(-1)?.status).toBe("QUEUED");
  });

  it("tells a send whose attempt died from one in flight", async () => {
    const host = await mount();

    expect(host.textContent).toMatch(/Envio interrompido/);
    expect(host.textContent).toMatch(/Enviando/);
  });
});

describe("one period for cards and list (DLVB-29)", () => {
  it("asks for the period on screen, and the cards say which it is", async () => {
    const host = await mount();

    expect(api.calls.at(-1)?.window).toBe("24h");
    expect(host.textContent).toMatch(/Entregues \(24h\)/);

    await chip("7 dias");

    expect(api.calls.at(-1)?.window).toBe("7d");
    expect(host.textContent).toMatch(/Entregues \(7 dias\)/);
    expect(host.textContent).toMatch(/Falharam \(7 dias\)/);
  });

  it("keeps the status when the period changes", async () => {
    await mount();

    await chip("Falharam");
    await chip("30 dias");

    expect(api.calls.at(-1)).toEqual({ status: "FAILED", window: "30d" });
  });
});

describe("the p95 card (DLVB-31)", () => {
  it("says what it measures", async () => {
    const host = await mount();

    expect(host.textContent).toMatch(
      /tempo de resposta do sistema de vocês nas entregas bem-sucedidas do período/,
    );
  });
});

describe("a list past the count cap (DLVB-30)", () => {
  it("says the total is a floor, not the count", async () => {
    api.total = 10_000;
    api.totalCapped = true;

    const host = await mount();

    expect(host.textContent).toMatch(/Mais de 10.000 envios · página 1 de 500/);
    expect(host.textContent).toMatch(
      /Filtre por status ou período para ver os demais/,
    );
  });

  it("states an exact total as a count", async () => {
    api.total = 45;
    api.totalCapped = false;

    const host = await mount();

    expect(host.textContent).toMatch(/45 envios · página 1 de 3/);
    expect(host.textContent).not.toMatch(/Mais de/);
  });
});
