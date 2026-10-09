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
 * The webhook-lifecycle flake (wave 4b): under the full 3-worker run,
 * /dashboard/integrations?tab=webhooks showed "Selecione uma empresa" to a
 * BUSINESS_ADMIN. Root cause: the auth store is client state seeded after the
 * first render. loadAuth (the permission hooks) marked it loaded with the
 * role and NO company, and the company screens read a missing company as
 * "none" whether or not the session was known yet. Under load the layout's
 * setAuth came late, and the false empty state stayed on screen.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const COMPANY = "018f0000-0000-7000-8000-00000000000a";

const cookie = vi.hoisted(() => ({ token: "" }));

vi.mock("@/actions/cookies", () => ({ getCookies: async () => cookie.token }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard/integrations",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/integrations/tabs", () => ({
  IntegrationsTabs: () => createElement("nav", null, "Seções"),
}));

vi.mock("@/actions/integration", () => ({
  listApiKeys: async () => ({ success: true, message: "", data: [] }),
  listWebhookDeliveries: async () => ({
    success: true,
    message: "",
    data: {
      data: [],
      total: 0,
      meta: { delivered: 0, failed: 0, pending: 0, p95LatencyMs: null },
    },
  }),
  listWebhookEndpoints: async () => ({ success: true, message: "", data: [] }),
}));

import { useAuthStore } from "@/store/auth-store";
import { sessionCompanyOf } from "@/store/session-company";
import { IntegrationsContent } from "@/features/integrations/content";

const base64Url = (value: object) =>
  btoa(JSON.stringify(value))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const tokenFor = (payload: object) =>
  `${base64Url({ alg: "HS256" })}.${base64Url(payload)}.signature`;

beforeAll(() => {
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    id: null,
    businessId: null,
    role: null,
    permissions: [],
    enabledModules: null,
    isLoaded: false,
  } as never);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("loadAuth", () => {
  it("reads the company from the token, not only the role", async () => {
    cookie.token = tokenFor({
      sub: "u1",
      role: "BUSINESS_ADMIN",
      businessId: COMPANY,
    });

    await useAuthStore.getState().loadAuth();

    // Red before: businessId stayed null while isLoaded became true.
    expect(useAuthStore.getState()).toMatchObject({
      role: "BUSINESS_ADMIN",
      businessId: COMPANY,
      isLoaded: true,
    });
  });

  it("keeps a company the layout's setAuth already wrote", async () => {
    cookie.token = tokenFor({
      sub: "u1",
      role: "BUSINESS_ADMIN",
      businessId: null,
    });
    useAuthStore.setState({ businessId: COMPANY } as never);

    await useAuthStore.getState().loadAuth();

    expect(useAuthStore.getState().businessId).toBe(COMPANY);
  });
});

describe("sessionCompanyOf", () => {
  it("is pending until the session is known, and none only after", () => {
    expect(sessionCompanyOf({ businessId: null, isLoaded: false })).toEqual({
      businessId: undefined,
      pending: true,
    });
    expect(sessionCompanyOf({ businessId: "", isLoaded: true })).toEqual({
      businessId: undefined,
      pending: false,
    });
    expect(sessionCompanyOf({ businessId: COMPANY, isLoaded: false })).toEqual({
      businessId: COMPANY,
      pending: false,
    });
  });
});

describe("Integrações on /dashboard before the session is seeded", () => {
  async function mount(): Promise<HTMLElement> {
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () =>
      root!.render(
        createElement(
          QueryClientProvider,
          { client },
          createElement(IntegrationsContent, {
            mode: "dashboard",
            searchParams: { tab: "webhooks" },
          }),
        ),
      ),
    );

    return host;
  }

  it("shows the screen loading, never 'Selecione uma empresa'", async () => {
    const host = await mount();

    // Red before: the empty state rendered on the first pass.
    expect(host.textContent).not.toMatch(/Selecione uma empresa/);
    expect(host.querySelector("[data-session-company-pending]")).not.toBeNull();

    // The layout seeds the session: the screen is the company's.
    await act(async () =>
      useAuthStore.getState().setAuth({
        id: "u1",
        businessId: COMPANY,
        role: "BUSINESS_ADMIN",
        permissions: [],
        enabledModules: ["DELIVERIES"],
      }),
    );

    expect(host.querySelector("[data-session-company-pending]")).toBeNull();
    expect(host.textContent).not.toMatch(/Selecione uma empresa/);
  });

  it("says there is no company only once the session is known to have none", async () => {
    useAuthStore.setState({
      role: "BUSINESS_ADMIN",
      isLoaded: true,
      businessId: null,
    } as never);

    const host = await mount();

    expect(host.querySelector("[data-session-company-pending]")).toBeNull();
    expect(host.textContent).toMatch(/Selecione uma empresa/);
  });
});
