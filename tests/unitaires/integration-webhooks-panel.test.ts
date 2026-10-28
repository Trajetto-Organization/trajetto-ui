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
 * The webhooks list and the breaker (Entregas 14; DLVB-25, CRIT-24).
 *
 * An endpoint our breaker switched off came back only when somebody saved it
 * unchanged — the note said so — and Salvar is now disabled on an untouched
 * form (decision 2.5). "Reativar envios" is that gesture on its own. The
 * paused state says what pausing costs: the events of the pause are not sent.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const api = vi.hoisted(() => ({
  reactivated: [] as string[],
  listed: 0,
}));

const ENDPOINTS = [
  {
    id: "wh-off",
    name: "ERP que caiu",
    url: "https://erp.exemplo.com.br/caiu",
    topics: ["delivery.*"],
    is_active: true,
    disabled_at: "2026-09-27T10:00:00.000Z",
    consecutive_failures: 20,
    created_at: "2026-09-01T12:00:00.000Z",
  },
  {
    id: "wh-paused",
    name: "ERP em manutenção",
    url: "https://erp.exemplo.com.br/pausa",
    topics: ["route.*"],
    is_active: false,
    disabled_at: null,
    consecutive_failures: 0,
    created_at: "2026-09-01T12:00:00.000Z",
  },
  {
    id: "wh-on",
    name: "ERP em dia",
    url: "https://erp.exemplo.com.br/ok",
    topics: ["route.*"],
    is_active: true,
    disabled_at: null,
    consecutive_failures: 0,
    created_at: "2026-09-01T12:00:00.000Z",
  },
];

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

// The writes stay Server Actions; the list goes through the relay.
vi.mock("@/actions/integration", () => ({
  reactivateWebhookEndpoint: async (_businessId: string, id: string) => {
    api.reactivated.push(id);

    return {
      success: true,
      message: "Endpoint reativado.",
      data: { id, reactivated: true, released: 3 },
    };
  },
  deleteWebhookEndpoint: async () => ({ success: true, message: "" }),
  getIntegrationCatalogue: async () => ({
    success: true,
    message: "",
    data: { topics: [] },
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { stubRelay } from "./helpers/relay-fetch";
import { useAuthStore } from "@/store/auth-store";
import { WebhooksPanel } from "@/features/integrations/webhooks/panel";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

beforeEach(() => {
  api.reactivated.length = 0;
  api.listed = 0;

  stubRelay({
    "/integrations/webhook-endpoints": () => {
      api.listed += 1;

      return { data: ENDPOINTS };
    },
  });

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

async function mount(): Promise<void> {
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
        createElement(WebhooksPanel, {
          businessId: "018f0000-0000-7000-8000-00000000000b",
        }),
      ),
    );
  });

  await settle();
}

/** The endpoint's card: the smallest bordered box holding its name. */
function card(name: string): HTMLElement {
  const found = [
    ...document.querySelectorAll<HTMLElement>("div.rounded-lg.border"),
  ]
    .filter((candidate) => candidate.textContent?.includes(name))
    .sort(
      (a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0),
    )[0];

  expect(found, `cartão ${name} não encontrado`).toBeDefined();

  return found;
}

const reactivateIn = (scope: HTMLElement) =>
  [...scope.querySelectorAll("button")].find((candidate) =>
    /reativar envios/i.test(candidate.textContent ?? ""),
  );

describe("an endpoint our breaker switched off", () => {
  it("offers Reativar envios, which calls the API and reloads the list", async () => {
    await mount();

    const button = reactivateIn(card("ERP que caiu"));

    expect(button, "sem o botão Reativar envios").toBeDefined();

    const before = api.listed;

    await act(async () => button!.click());
    await settle();

    expect(api.reactivated).toEqual(["wh-off"]);
    expect(api.listed).toBeGreaterThan(before);
  });

  it("is the only one that offers it", async () => {
    await mount();

    expect(reactivateIn(card("ERP em manutenção"))).toBeUndefined();
    expect(reactivateIn(card("ERP em dia"))).toBeUndefined();
  });

  it("no longer tells people to save it unchanged", async () => {
    await mount();

    expect(card("ERP que caiu").textContent).not.toMatch(
      /salvar o endpoint outra vez/,
    );
    expect(card("ERP que caiu").textContent).toMatch(
      /guardados por até 30 dias/,
    );
  });

  it("is disabled, with the reason, for a profile that cannot write integrations", async () => {
    useAuthStore.setState({
      role: "BUSINESS_USER",
      isLoaded: true,
      permissions: [
        { permissionKey: "integration_manage", canRead: true, canWrite: false },
      ],
    } as never);

    await mount();

    const button = reactivateIn(card("ERP que caiu"));

    expect(button?.disabled).toBe(true);
  });
});

describe("a paused endpoint", () => {
  it("says the events of the pause are not sent later", async () => {
    await mount();

    expect(card("ERP em manutenção").textContent).toMatch(
      /eventos que acontecem enquanto ele está pausado não são enviados depois/,
    );
  });
});
