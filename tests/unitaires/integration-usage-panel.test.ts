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
 * Uso da API (Entregas 16; DLVB-33).
 *
 * The chart printed raw ISO dates ("2026-09-15"), the days were UTC days, and
 * a refused read — the API answered 400 to every call of this screen — drew
 * "Nenhuma chamada nesta janela", which reads as a customer whose ERP stopped
 * calling.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard/integrations",
  useSearchParams: () => new URLSearchParams(),
}));

const api = vi.hoisted(() => ({
  answer: null as null | Record<string, unknown>,
  pending: false,
}));

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

vi.mock("@/actions/integration", () => ({
  listApiUsage: () =>
    api.pending ? new Promise(() => undefined) : Promise.resolve(api.answer),
}));

import { UsagePanel } from "@/features/integrations/usage/panel";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

beforeEach(() => {
  localStorage.clear();
  api.pending = false;

  api.answer = {
    success: true,
    message: "",
    data: {
      totals: { ok: 8, clientError: 1, serverError: 0 },
      byRoute: [
        {
          method: "GET",
          route: "/integration/v1/deliveries",
          ok: 8,
          clientError: 1,
          serverError: 0,
        },
      ],
      byDay: [
        { day: "2026-09-14", total: 4 },
        { day: "2026-09-15", total: 5 },
      ],
      keys: [],
      timeZone: "America/Manaus",
    },
  };
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

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
        createElement(UsagePanel, {
          businessId: "018f0000-0000-7000-8000-00000000000b",
        }),
      ),
    );
  });

  for (let index = 0; index < 4; index += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }

  return host;
}

describe("the calls per day", () => {
  it("are labelled as a person reads a date, not in ISO", async () => {
    const host = await mount();

    expect(host.textContent).toContain("14/09");
    expect(host.textContent).toContain("15/09");
    expect(host.textContent).not.toContain("2026-09-15");

    const bar = host.querySelector('[title^="15/09/2026"]');

    expect(bar?.getAttribute("title")).toBe("15/09/2026: 5 chamadas");
  });

  it("say they are the company's calendar days", async () => {
    const host = await mount();

    expect(host.textContent).toMatch(
      /dias do calendário da empresa \(America\/Manaus\)/,
    );
  });
});

describe("a refused read", () => {
  it("is shown as a failure, not as a customer who stopped calling", async () => {
    api.answer = { success: false, message: "Validation Error", status: 400 };

    const host = await mount();

    expect(host.textContent).toMatch(/Não foi possível carregar o uso da API/);
    expect(host.textContent).not.toMatch(/Nenhuma chamada nesta janela/);
  });

  it("draws no totals above the error, which would read as zero calls", async () => {
    api.answer = { success: false, message: "Validation Error", status: 400 };

    const host = await mount();

    expect(host.textContent).not.toMatch(/Funcionaram/);
    expect(host.textContent).not.toMatch(/Nós erramos/);
    expect(host.querySelector("[data-usage-totals]")).toBeNull();
  });
});

describe("while the numbers load", () => {
  it("shows placeholders instead of zeros", async () => {
    api.pending = true;

    const host = await mount();

    expect(host.querySelector('[data-usage-totals="loading"]')).not.toBeNull();
    expect(host.textContent).not.toMatch(/Funcionaram/);
  });
});

describe("a window with no calls", () => {
  it("still says what 'Hoje' means, in the company's zone", async () => {
    api.answer = {
      success: true,
      message: "",
      data: {
        totals: { ok: 0, clientError: 0, serverError: 0 },
        byRoute: [],
        byDay: [],
        keys: [],
        timeZone: "America/Rio_Branco",
      },
    };

    const host = await mount();

    expect(host.textContent).toMatch(/Nenhuma chamada nesta janela/);
    expect(host.textContent).toMatch(
      /dias do calendário da empresa \(America\/Rio_Branco\): “Hoje” começa à meia-noite dela/,
    );
  });
});
