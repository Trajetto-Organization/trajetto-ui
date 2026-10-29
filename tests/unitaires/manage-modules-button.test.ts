import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "react-query";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

// The plan dialog itself is not under test: only what closing it does.
vi.mock("@/features/business-entitlements/manage-form", () => ({
  ManageEntitlementsForm: ({ onClose }: { onClose: () => void }) =>
    createElement("button", { "data-close": "", onClick: onClose }, "Fechar"),
}));

import { queryClientProps } from "@/lib/query-client-props";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";

/**
 * "Gerenciar módulos" on a "Módulo não contratado" state (decision 4.3).
 *
 * Closing the plan dialog only called router.refresh(). That re-renders the
 * server content, but a screen that reads its access through react-query
 * (Integrações lists its keys client-side) kept its cached refusal and went
 * on saying "não contratado" after the MASTER enabled the module, until
 * somebody pressed Atualizar. Closing now revalidates the whole tab, the
 * same as Atualizar (decision 2.1).
 */
const COMPANY = "018f0000-0000-7000-8000-00000000c0de";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

afterEach(() => {
  queryClientProps.clear();
  router.refresh.mockClear();
});

describe("closing the plan dialog", () => {
  it("drops the client cache that still held the refusal, besides re-rendering the page", async () => {
    // What a client-fetched screen cached before the module was enabled,
    // no longer on screen once the dialog covered it.
    queryClientProps.setQueryData(["integrations_api_keys", COMPANY], {
      refusal: "MODULE_NOT_ENABLED",
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClientProps },
          createElement(ManageModulesButton, { businessId: COMPANY }),
        ),
      );
    });

    await act(async () => {
      container.querySelector("button")?.click();
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-close]")?.click();
    });

    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(
      queryClientProps.getQueryData(["integrations_api_keys", COMPANY]),
    ).toBeUndefined();

    await act(async () => root.unmount());
    container.remove();
  });
});
