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
 * The Integrações screen and who may see it (INT-MOD-1, DOCS-12, decisions
 * 3.7, 4.1, 4.3 and 2.6).
 *
 * A company without Entregas saw four empty panels and a "Nova chave" that
 * issued keys answering 403 forever; every refusal looked like an empty list;
 * the "Selecione uma empresa" sentence repeated its own title; and switching
 * company kept the open panel's filters.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const nav = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/integrations",
  useSearchParams: () => nav.params,
}));

// The selector is its own feature (and its own fetching); the band only
// needs something in its place.
vi.mock("@/app/(protected)/_components/shared/business-selector", () => ({
  BusinessSelector: () => createElement("div", { role: "combobox" }, "Empresa"),
}));

vi.mock("@/features/integrations/tabs", () => ({
  IntegrationsTabs: () => createElement("nav", null, "Seções"),
}));

const api = vi.hoisted(() => ({
  keys: { success: true, message: "", data: [] } as Record<string, unknown>,
  keyCalls: 0,
  keyBusinessIds: [] as Array<string | undefined>,
  deliveries: [] as Array<{ status?: string }>,
}));

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

// The writes stay Server Actions; the panels' reads go through the relay.
vi.mock("@/actions/integration", () => ({}));

import { ndjson, refusal, stubRelay } from "./helpers/relay-fetch";
import { useAuthStore } from "@/store/auth-store";
import { queryClientProps } from "@/lib/query-client-props";
import { IntegrationsContent } from "@/features/integrations/content";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

/**
 * The keys list as the relay answers it: `api.keys` is written as the value
 * the screen reads (`success`, `code`, `status`), and becomes the API's
 * envelope or its refusal on the wire.
 */
async function keysReply(): Promise<unknown> {
  const answer = (await api.keys) as {
    success: boolean;
    message?: string;
    data?: unknown;
    code?: string;
    status?: number;
  };

  if (answer.success) return { data: answer.data };

  return refusal(answer.status ?? 500, {
    ...(answer.code ? { code: answer.code } : {}),
    message: answer.message,
  });
}

const A = "018f0000-0000-7000-8000-00000000000a";
const B = "018f0000-0000-7000-8000-00000000000b";

let root: Root | null = null;
let client: QueryClient;

beforeEach(() => {
  nav.params = new URLSearchParams();
  api.keys = { success: true, message: "", data: [] };
  api.keyCalls = 0;
  api.keyBusinessIds.length = 0;
  api.deliveries.length = 0;
  localStorage.clear();

  stubRelay({
    "/integrations/api-keys": (url) => {
      api.keyCalls += 1;
      api.keyBusinessIds.push(url.searchParams.get("businessId") ?? undefined);

      return keysReply();
    },
    "/integrations/webhook-deliveries": (url) => {
      api.deliveries.push({
        status: url.searchParams.get("status") ?? undefined,
      });

      return ndjson(
        {
          total: 0,
          page: 1,
          pageSize: 20,
          searchMeta: {
            delivered: 0,
            failed: 0,
            pending: 0,
            p95LatencyMs: null,
          },
        },
        [],
      );
    },
  });

  useAuthStore.setState({
    role: "MASTER",
    isLoaded: true,
    permissions: [],
    businessId: null,
    enabledModules: null,
  } as never);

  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  queryClientProps.clear();
});

async function settle(times = 4): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }
}

function render(mode: "admin" | "dashboard", tab = "api-keys") {
  return createElement(
    QueryClientProvider,
    { client },
    createElement(IntegrationsContent, {
      mode,
      searchParams: {
        tab,
        businessId: nav.params.get("businessId") ?? undefined,
      },
    }),
  );
}

async function mount(
  mode: "admin" | "dashboard",
  tab = "api-keys",
): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => root!.render(render(mode, tab)));
  await settle();

  return host;
}

describe("a company without Entregas (decision 4.3)", () => {
  it("sees the module state, and no button to issue a key", async () => {
    nav.params = new URLSearchParams({ businessId: A });
    api.keys = {
      success: false,
      message: "Este módulo não está habilitado para a sua empresa.",
      code: "MODULE_NOT_ENABLED",
      status: 403,
    };

    const host = await mount("admin");

    expect(host.textContent).toMatch(/Módulo Entregas não contratado/);
    expect(host.textContent).not.toMatch(/Nova chave/);
    expect(host.textContent).not.toMatch(/Nenhuma chave emitida/);
  });

  it("gives the master the way to enable Entregas, not 'fale com o suporte'", async () => {
    nav.params = new URLSearchParams({ businessId: A });
    api.keys = {
      success: false,
      message: "Este módulo não está habilitado para a sua empresa.",
      code: "MODULE_NOT_ENABLED",
      status: 403,
    };

    const host = await mount("admin");

    const buttons = [...host.querySelectorAll("button")].map(
      (button) => button.textContent,
    );

    expect(buttons).toContain("Gerenciar módulos");
    expect(host.textContent).toMatch(/Habilite-o em Módulos Contratados/);
    expect(host.textContent).not.toMatch(/Fale com o suporte/);
  });

  it("keeps Atualizar in the band, so enabling the module elsewhere recovers the screen", async () => {
    // Atualizar refreshes the app's own client (decision 2.1), so the screen
    // is mounted under it here.
    client = queryClientProps;
    client.clear();

    nav.params = new URLSearchParams({ businessId: A });
    api.keys = {
      success: false,
      message: "Este módulo não está habilitado para a sua empresa.",
      code: "MODULE_NOT_ENABLED",
      status: 403,
    };

    const host = await mount("admin", "monitor");

    const refresh = [...host.querySelectorAll("button")].find((button) =>
      /Atualizar/.test(button.textContent ?? ""),
    ) as HTMLButtonElement | undefined;

    expect(refresh).toBeDefined();
    expect(api.keyCalls).toBe(1);

    // The module is enabled somewhere else; Atualizar re-asks the API.
    api.keys = { success: true, message: "", data: [] };

    await act(async () => refresh!.click());
    await settle();

    expect(api.keyCalls).toBe(2);
    expect(host.textContent).not.toMatch(/Módulo Entregas não contratado/);
  });

  it("tells a company user to talk to support on its own screen", async () => {
    useAuthStore.setState({
      role: "BUSINESS_ADMIN",
      businessId: A,
      enabledModules: ["FLEET"],
    } as never);

    const host = await mount("dashboard");

    expect(host.textContent).toMatch(/Fale com o suporte/);
    expect(host.textContent).not.toMatch(/Gerenciar módulos/);
  });

  it("is told on its own screen without asking the API", async () => {
    useAuthStore.setState({
      role: "BUSINESS_ADMIN",
      businessId: A,
      enabledModules: ["FLEET"],
    } as never);

    const host = await mount("dashboard", "monitor");

    expect(host.textContent).toMatch(/Módulo Entregas não contratado/);
    expect(api.keyCalls).toBe(0);
    expect(api.deliveries).toHaveLength(0);
  });
});

describe("a profile without integrations (decision 4.1)", () => {
  it("is told it lacks the permission, not that the list is empty", async () => {
    nav.params = new URLSearchParams({ businessId: A });
    api.keys = {
      success: false,
      message: "Usuário não possui permissão para visualizar este conteúdo.",
      status: 403,
    };

    const host = await mount("admin");

    expect(host.textContent).toMatch(/Sem permissão para esta seção/);
    expect(host.textContent).not.toMatch(/Módulo Entregas não contratado/);
  });

  it("shows the API's own sentence for a tenant refusal, not a profile claim", async () => {
    nav.params = new URLSearchParams({ businessId: A });
    api.keys = {
      success: false,
      message: "Acesso negado aos dados desta empresa.",
      code: "TENANT_ACCESS_DENIED",
      status: 403,
    };

    const host = await mount("admin");

    expect(host.textContent).toMatch(/Acesso negado aos dados desta empresa\./);
    expect(host.textContent).not.toMatch(
      /perfil de acesso não inclui Integrações/,
    );
  });
});

describe("the company on /dashboard (tenant from the URL)", () => {
  it("is the session's, whatever ?businessId= says", async () => {
    useAuthStore.setState({
      role: "BUSINESS_ADMIN",
      businessId: A,
      enabledModules: ["DELIVERIES"],
    } as never);
    nav.params = new URLSearchParams({ businessId: B });

    await mount("dashboard");

    expect(api.keyBusinessIds.length).toBeGreaterThan(0);
    expect(api.keyBusinessIds.every((id) => id === A)).toBe(true);
  });

  it("is the selector's on /admin", async () => {
    nav.params = new URLSearchParams({ businessId: B });

    await mount("admin");

    expect(api.keyBusinessIds.every((id) => id === B)).toBe(true);
  });
});

describe("no company chosen yet (decision 3.7)", () => {
  it("says what is configured per company instead of repeating the title", async () => {
    const host = await mount("admin");

    expect(host.textContent).toMatch(/Selecione uma empresa/);
    expect(host.textContent).toMatch(
      /Chaves de API, webhooks e o uso da API são configurados por empresa/,
    );
    expect(host.textContent).not.toMatch(/para gerenciar as integrações/);
  });
});

describe("switching company (decision 2.6)", () => {
  it("restarts the open panel instead of carrying its filter over", async () => {
    nav.params = new URLSearchParams({ businessId: A });

    await mount("admin", "monitor");

    const failed = [...document.querySelectorAll("button[aria-pressed]")].find(
      (button) => (button.textContent ?? "").startsWith("Falharam"),
    ) as HTMLButtonElement;

    await act(async () => failed.click());
    await settle();

    expect(api.deliveries.at(-1)?.status).toBe("FAILED");

    nav.params = new URLSearchParams({ businessId: B });

    await act(async () => root!.render(render("admin", "monitor")));
    await settle();

    // Company B opens on "Todos", not on A's "Falharam".
    expect(api.deliveries.at(-1)?.status).toBeUndefined();
  });
});

describe("while the access check is in flight (web-e2e)", () => {
  it("says it is loading, so the tour waits and a screen reader is told", async () => {
    // Found by tests/ui/tutorial-tours.spec.ts: the webhooks tour's
    // "Atualizar" step reads its anchor from the band, which is empty while
    // the check runs, and this skeleton carried no loading marker — so the
    // tour gave up after 1.5 s instead of waiting (it waits up to 6 s
    // behind a `data-tutorial="loading"`), and nothing said "busy".
    let release: (value: unknown) => void = () => {};

    api.keys = new Promise((resolve) => {
      release = resolve;
    }) as never;

    useAuthStore.setState({ role: "BUSINESS_ADMIN", businessId: A } as never);

    const host = await mount("dashboard", "webhooks");
    const busy = host.querySelector('[data-tutorial="loading"]');

    expect(
      busy,
      "o esqueleto da checagem não se anuncia como carregando",
    ).not.toBeNull();
    expect(busy?.getAttribute("aria-busy")).toBe("true");

    release({ success: true, message: "", data: [] });
    await settle();
  });
});

describe("while the access check is on its way (tour and screen readers)", () => {
  it("the api-keys tab says it is loading, because the band's buttons wait for the same answer", async () => {
    // Red before: the keys skeleton carried no loading marker. The band
    // (Atualizar, Documentação, Nova chave) only renders once this request
    // answers, so on a slow answer the guided tour waited its 1.5 s for
    // "Atualizar" and showed the step pointing at nothing (found by
    // tests/ui/tutorial-tours.spec.ts under three workers).
    nav.params = new URLSearchParams({ businessId: A });
    api.keys = new Promise(() => undefined) as never;

    const host = await mount("admin");

    expect(host.querySelector('[data-tutorial="revalidate"]')).toBeNull();
    expect(
      host.querySelector('[data-tutorial="loading"][aria-busy="true"]'),
    ).not.toBeNull();
  });
});
