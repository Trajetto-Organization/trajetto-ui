import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "react-query";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

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

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

/** The API as the server actions answer it, counting requests per filter. */
const api = vi.hoisted(() => ({
  usage: {} as Record<string, number>,
  deliveries: {} as Record<string, number>,
}));

vi.mock("@/actions/integration", () => ({
  listApiUsage: async (days: number) => {
    api.usage[days] = (api.usage[days] ?? 0) + 1;

    return {
      success: true,
      message: "",
      data: {
        totals: { ok: 0, clientError: 0, serverError: 0 },
        byRoute: [],
        byDay: [],
        keys: [],
      },
    };
  },
  listWebhookDeliveries: async (
    _page: number,
    _size: number,
    filters: { status?: string },
  ) => {
    const key = filters.status ?? "ALL";
    api.deliveries[key] = (api.deliveries[key] ?? 0) + 1;

    return {
      success: true,
      message: "",
      data: {
        data: [],
        total: 0,
        meta: { delivered: 0, failed: 0, pending: 0, p95LatencyMs: null },
      },
    };
  },
  resendWebhookDelivery: async () => ({ success: true, message: "" }),
}));

import { queryClientProps } from "@/lib/query-client-props";
import { UsagePanel } from "@/features/integrations/usage/panel";
import { MonitorPanel } from "@/features/integrations/monitor/panel";

/**
 * Uso da API and Monitor de envios, switching filters (Entregas 15, 16;
 * DLVB-36).
 *
 * Both inherited the five-minute `staleTime`: Hoje → 7 dias → Hoje within
 * five minutes showed the first "Hoje" again, calls made since missing, and
 * the webhook log did the same between its status chips.
 */
beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

beforeEach(() => {
  api.usage = {};
  api.deliveries = {};
  router.refresh.mockClear();
  localStorage.clear();
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
  queryClientProps.clear();
});

async function until(condition: () => boolean, ms = 2_000): Promise<boolean> {
  const deadline = performance.now() + ms;

  while (performance.now() < deadline) {
    if (condition()) return true;
    await act(async () => {
      await new Promise((done) => setTimeout(done, 20));
    });
  }

  return condition();
}

async function mount(panel: React.ElementType): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClientProps },
        createElement(panel, {
          businessId: "018f0000-0000-7000-8000-00000000000b",
        }),
      ),
    );
  });

  unmounts.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  return container;
}

async function chip(container: HTMLElement, label: string): Promise<void> {
  const button = [...container.querySelectorAll("button[aria-pressed]")].find(
    (candidate) => (candidate.textContent ?? "").startsWith(label),
  ) as HTMLButtonElement | undefined;

  expect(button, `chip "${label}" não encontrado`).toBeDefined();
  await act(async () => button!.click());
}

describe("the Uso da API panel", () => {
  it("asks again when the person goes back to a period", async () => {
    const panel = await mount(UsagePanel);
    expect(await until(() => api.usage[7] === 1)).toBe(true);

    await chip(panel, "30 dias");
    expect(await until(() => api.usage[30] === 1)).toBe(true);

    await chip(panel, "7 dias");

    expect(
      await until(() => api.usage[7] === 2),
      "voltou para 7 dias com os números antigos",
    ).toBe(true);
  });
});

describe("the Monitor de envios panel", () => {
  it("asks again when the person goes back to a status", async () => {
    const panel = await mount(MonitorPanel);
    expect(await until(() => api.deliveries.ALL === 1)).toBe(true);

    await chip(panel, "Falharam");
    expect(await until(() => api.deliveries.FAILED === 1)).toBe(true);

    await chip(panel, "Todos");

    expect(
      await until(() => api.deliveries.ALL === 2),
      "voltou para Todos com a lista antiga",
    ).toBe(true);
  });
});

describe("the panels' own Atualizar", () => {
  it.each([
    ["the Uso da API panel", UsagePanel, () => api.usage[7] ?? 0],
    [
      "the Monitor de envios panel",
      MonitorPanel,
      () => api.deliveries.ALL ?? 0,
    ],
  ] as const)(
    "refreshes the whole tab from %s (decision 2.1)",
    async (_name, panel, requests) => {
      const container = await mount(panel);
      expect(await until(() => requests() === 1)).toBe(true);

      const refresh = container.querySelector<HTMLButtonElement>(
        "button[data-revalidate]",
      );
      expect(refresh).not.toBeNull();

      await act(async () => refresh!.click());

      expect(await until(() => requests() === 2)).toBe(true);
      expect(
        router.refresh,
        "o conteúdo do servidor da aba não foi atualizado",
      ).toHaveBeenCalledTimes(1);
    },
  );
});
