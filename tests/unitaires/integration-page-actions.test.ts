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
 * The Integrações band's Atualizar (REV-1, decisions 2.1 and 3.6).
 *
 * It invalidated the open tab's own react-query key and nothing else: the
 * server content and every other cached read stayed as they were, unlike
 * every other "Atualizar" of the product. On a phone it was an unlabelled
 * 36px square beside the create button instead of a full-width labelled
 * button like the legacy screens.
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
vi.mock("@/actions/integration", () => ({}));

import { useAuthStore } from "@/store/auth-store";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { IntegrationsPageActions } from "@/features/integrations/page-actions";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

beforeEach(() => {
  router.refresh.mockClear();
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

async function mount(): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  const client = new QueryClient();

  await act(async () => {
    root!.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(ProtectedPageToolbar, {
          // The /admin band: the company selector sits on the same line.
          context: createElement("div", { role: "combobox" }, "Empresa"),
          actions: createElement(IntegrationsPageActions, {
            activeTab: "api-keys",
            businessId: "018f0000-0000-7000-8000-00000000000b",
            mode: "admin",
          }),
        }),
      ),
    );
  });

  return host;
}

describe("Atualizar on the Integrações band", () => {
  it("refreshes the whole tab, server content included (decision 2.1)", async () => {
    const host = await mount();

    const refresh = host.querySelector<HTMLButtonElement>(
      "button[data-revalidate]",
    );

    expect(refresh).not.toBeNull();

    await act(async () => refresh!.click());

    expect(
      router.refresh,
      "só a chave da aba foi invalidada",
    ).toHaveBeenCalledTimes(1);
  });

  it("stacks full width with its label on a phone, at the standard h-9", async () => {
    const host = await mount();

    const group = host.querySelector("[data-page-actions]");

    expect(group, "the buttons are not inside a PageActions").not.toBeNull();

    const refresh = host.querySelector<HTMLButtonElement>(
      "button[data-revalidate]",
    )!;

    expect(refresh.className).toContain("w-full");
    // Decision 16.61: h-9 beside the selector too, not the selector's h-10.
    expect(refresh.className).toContain("h-9");
    expect(refresh.className).not.toMatch(/\bh-10\b|\bw-9\b/);

    // The label is always rendered, never `hidden sm:inline`.
    expect(refresh.querySelector("span.hidden")).toBeNull();
    expect(refresh.textContent).toMatch(/Atualizar/);
  });
});
