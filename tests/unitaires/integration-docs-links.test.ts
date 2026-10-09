import * as React from "react";
import { act, createElement } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
 * Integrações points at the developer portal where the person needs it
 * (decision 11.1; DOCS-01 and DOCS-06).
 *
 * The portal existed only behind the sidebar item: the band of the screen
 * that issues keys and endpoints said nothing about it, the issued key did
 * not say how to authenticate, and the signing secret's hint left out the two
 * mistakes that make a correct HMAC fail or a replay pass — hashing a parsed
 * body instead of the raw bytes, and not bounding `t` against the clock.
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
  usePathname: () => "/admin/integrations",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

vi.mock("@/actions/integration", () => ({
  createApiKey: async () => ({
    success: true,
    message: "Chave criada.",
    data: {
      id: "key-1",
      prefix: "tjk_live_abc",
      token: "tjk_live_abc.segredo",
    },
  }),
  getIntegrationCatalogue: async () => ({
    success: true,
    message: "",
    data: {
      version: "v1",
      topics: [
        {
          topic: "route.started",
          family: "route",
          description: "O motorista saiu com a rota.",
        },
      ],
      scopes: [],
    },
  }),
  saveWebhookEndpoint: async () => ({
    success: true,
    message: "Endpoint criado.",
    data: { id: "wh-1", secret: "whsec_do_endpoint" },
  }),
  rotateWebhookSecret: async () => ({
    success: true,
    message: "Novo segredo gerado.",
    data: { id: "wh-9", secret: "whsec_rotacionado" },
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useAuthStore } from "@/store/auth-store";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { ApiKeyDialog } from "@/features/integrations/api-keys/create-dialog";
import { IntegrationsPageActions } from "@/features/integrations/page-actions";
import { WebhookFormDialog } from "@/features/integrations/webhooks/form-dialog";
import { RotateSecretDialog } from "@/features/integrations/webhooks/rotate-secret-dialog";
import { SIGNATURE_TOLERANCE_SECONDS } from "@/features/integrations/lib/docs-links";

/** The snapshot of GET /integration/docs/openapi.json the portal tests read. */
const PUBLIC_SPEC = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "tests/unitaires/fixtures/public-openapi.json"),
    "utf8",
  ),
) as { "x-trajetto-webhooks": { signature: { tolerance_seconds: number } } };

beforeAll(() => {
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    role: "MASTER",
    isLoaded: true,
    permissions: [],
  } as never);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function settle(times = 3): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }
}

async function mount(element: React.ReactElement): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    root!.render(createElement(QueryClientProvider, { client }, element));
  });
  await settle();
}

function button(name: RegExp): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find((candidate) =>
    name.test(candidate.textContent ?? ""),
  );

  expect(found, `botão ${name} não encontrado`).toBeDefined();

  return found as HTMLButtonElement;
}

async function click(target: HTMLElement): Promise<void> {
  await act(async () => target.click());
  await settle();
}

async function type(id: string, value: string): Promise<void> {
  const input = document.getElementById(id) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;

  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** A link that opens the portal in a new tab and says so to a screen reader. */
function expectPortalLink(href: string): HTMLAnchorElement {
  const link = document.querySelector<HTMLAnchorElement>(`a[href="${href}"]`);

  expect(link, `nenhum link para ${href}`).not.toBeNull();
  expect(link!.target).toBe("_blank");
  expect(link!.rel).toContain("noopener");
  expect(link!.rel).toContain("noreferrer");
  expect(link!.querySelector(".sr-only")?.textContent).toMatch(
    /abre em nova aba/,
  );

  return link!;
}

describe("the Integrações band", () => {
  it("links to the developer portal beside its actions, at the band's size", async () => {
    await mount(
      createElement(ProtectedPageToolbar, {
        context: createElement("div", { role: "combobox" }, "Empresa"),
        actions: createElement(IntegrationsPageActions, {
          activeTab: "api-keys",
          businessId: "018f0000-0000-7000-8000-00000000000b",
          mode: "admin",
        }),
      }),
    );

    const link = expectPortalLink("/docs");

    expect(
      link.closest("[data-page-actions]"),
      "outside the actions band",
    ).not.toBeNull();
    expect(link.textContent).toMatch(/Documentação da API/);

    // Same rule as Atualizar: h-9 on /admin and /dashboard (decision 16.61),
    // full width with its label on a phone (decision 3.6).
    expect(link.className).toContain("h-9");
    expect(link.className).not.toContain("h-10");
    expect(link.className).toContain("w-full");
  });
});

describe("the issued key", () => {
  it("points at the authentication guide", async () => {
    await mount(
      createElement(ApiKeyDialog, {
        businessId: "018f0000-0000-7000-8000-00000000000b",
        isOpen: true,
        mode: "dashboard",
        onClose: () => undefined,
        onCreated: () => undefined,
      }),
    );

    await type("api-key-name", "ERP Protheus");
    await click(button(/emitir chave/i));

    expect(document.querySelector("[data-copy-field]")?.textContent).toContain(
      "tjk_live_abc.segredo",
    );
    expectPortalLink("/docs/autenticacao");
  });
});

describe("a webhook's signing secret", () => {
  it("the tolerance the hint states is the one the API publishes", () => {
    expect(SIGNATURE_TOLERANCE_SECONDS).toBe(
      PUBLIC_SPEC["x-trajetto-webhooks"].signature.tolerance_seconds,
    );
  });

  it("a new endpoint's hint names the raw body and the clock bound, and links the guide", async () => {
    await mount(
      createElement(WebhookFormDialog, {
        businessId: "018f0000-0000-7000-8000-00000000000b",
        endpoint: null,
        isOpen: true,
        onClose: () => undefined,
        onSaved: () => undefined,
      }),
    );

    await type("webhook-name", "ERP");
    await type("webhook-url", "https://erp.exemplo.com.br/hook");

    const topic = [...document.querySelectorAll("label")]
      .find((label) => label.textContent?.includes("route.started"))
      ?.querySelector<HTMLElement>('[role="checkbox"], input[type="checkbox"]');

    expect(topic, "o evento route.started não está na tela").toBeTruthy();

    await click(topic!);
    await click(button(/criar endpoint/i));

    const reveal = document
      .querySelector("[data-copy-field]")
      ?.closest(".grid");

    expect(reveal?.textContent).toContain("whsec_do_endpoint");

    const hint = reveal!.textContent ?? "";

    expect(hint).toMatch(/corpo cru/);
    expect(hint).toMatch(/JSON\.parse/);
    expect(hint).toContain(`${SIGNATURE_TOLERANCE_SECONDS} segundos`);

    expectPortalLink("/docs/assinatura");
  });

  it("a rotated secret's hint links the guide too", async () => {
    await mount(
      createElement(RotateSecretDialog, {
        businessId: "018f0000-0000-7000-8000-00000000000b",
        endpoint: {
          id: "wh-9",
          name: "ERP do embarcador",
          url: "https://erp.exemplo.com.br/hook",
          topics: ["route.*"],
          is_active: true,
          disabled_at: null,
          consecutive_failures: 0,
          created_at: "2026-09-01T12:00:00.000Z",
        },
        isOpen: true,
        onClose: () => undefined,
      }),
    );

    await click(button(/gerar novo segredo/i));

    expect(document.querySelector("[data-copy-field]")?.textContent).toContain(
      "whsec_rotacionado",
    );
    expectPortalLink("/docs/assinatura");
  });
});
