import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The customer messages panel (DLVB-03).
 *
 * On /dashboard the page handed it `""` as the company: the list went out as
 * `?businessId=` (a 400) and the refusal rendered as six "Não escrita" cards,
 * telling the dispatcher that nothing is sent when the truth was "could not
 * read". The panel now falls back to the session's company and shows a
 * failed read as a failure, with a way to try again.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

const SESSION_BUSINESS = "018f0000-0000-7000-8000-0000000000b1";

const templates = vi.hoisted(() => ({
  listMessageTemplates: vi.fn(),
  saveMessageTemplate: vi.fn(),
}));

vi.mock("@/actions/delivery/message-templates", () => templates);

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("tab=message-templates"),
}));

vi.mock("@/store/auth-store", () => ({
  useAuthStore: (select: (state: { businessId: string }) => unknown) =>
    select({ businessId: SESSION_BUSINESS }),
}));

vi.mock("@/lib/check-multiple-permissions", () => ({
  useCheckMultiplePermissions: () => ({ hasAllPermissions: true }),
  getPermissionName: () => "Gerenciar Entregas",
}));

import {
  MessageTemplatesPanel,
  templatesLoadError,
} from "@/features/deliveries/message-templates/panel";

const roots: Root[] = [];

afterEach(async () => {
  while (roots.length) {
    const root = roots.pop()!;
    await act(async () => root.unmount());
  }

  document.body.innerHTML = "";
  vi.clearAllMocks();
});

async function render(businessId: string | undefined): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const root = createRoot(host);
  roots.push(root);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(MessageTemplatesPanel, { businessId }),
      ),
    );
  });

  // Let the query settle and the panel redraw.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return host;
}

describe("the company the panel reads", () => {
  it("falls back to the session's company when the page passes none", async () => {
    templates.listMessageTemplates.mockResolvedValue({
      success: true,
      message: "",
      data: [],
    });

    await render("");

    expect(templates.listMessageTemplates).toHaveBeenCalledWith(
      SESSION_BUSINESS,
    );
  });
});

describe("a failed read", () => {
  it("is shown as a failure, not as six empty slots", async () => {
    templates.listMessageTemplates.mockResolvedValue({
      success: false,
      message:
        "Empresa não identificada. Selecione uma empresa para continuar.",
    });

    const host = await render(SESSION_BUSINESS);

    expect(host.textContent).toContain(
      "Não foi possível carregar as mensagens ao cliente",
    );
    expect(host.textContent).toContain("Empresa não identificada");
    expect(host.textContent).not.toContain(
      "Nenhuma mensagem é enviada neste momento.",
    );
    expect(host.textContent).toContain("Tentar novamente");
  });

  it("names a missing message only when the read succeeded", () => {
    expect(templatesLoadError({ success: true })).toBeNull();
    expect(templatesLoadError(undefined)).toBeNull();
    expect(templatesLoadError({ success: false, message: "" })).toContain(
      "Não foi possível",
    );
  });
});
