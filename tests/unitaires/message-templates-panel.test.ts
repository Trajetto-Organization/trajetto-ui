import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, describe, expect, it, vi } from "vitest";

import { refusal, stubRelay } from "./helpers/relay-fetch";

/**
 * The customer messages panel (DLVB-03).
 *
 * On /dashboard the page handed it `""` as the company: the list went out as
 * `?businessId=` (a 400) and the refusal rendered as six "Não escrita" cards,
 * telling the dispatcher that nothing is sent when the truth was "could not
 * read". The panel now falls back to the session's company and shows a
 * failed read as a failure, with a way to try again. The read is a relay
 * GET (it was a Server Action queued behind the page's other reads).
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

const SESSION_BUSINESS = "018f0000-0000-7000-8000-0000000000b1";

const templates = vi.hoisted(() => ({
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
  fetchMessageTemplates,
} from "@/features/deliveries/message-templates/panel";

const roots: Root[] = [];

afterEach(async () => {
  while (roots.length) {
    const root = roots.pop()!;
    await act(async () => root.unmount());
  }

  document.body.innerHTML = "";
  vi.clearAllMocks();
  vi.unstubAllGlobals();
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
    const relay = stubRelay({
      "/delivery/message-templates": () => ({ data: [] }),
    });

    await render("");

    const [read] = relay.callsTo("/delivery/message-templates");

    expect(read?.query.get("businessId")).toBe(SESSION_BUSINESS);
  });
});

describe("a failed read", () => {
  it("is shown as a failure, not as six empty slots", async () => {
    stubRelay({
      "/delivery/message-templates": () =>
        refusal(400, {
          code: "BUSINESS_REQUIRED",
          message:
            "Empresa não identificada. Selecione uma empresa para continuar.",
        }),
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

  it("says it could not read when the refusal brought no sentence", async () => {
    stubRelay({
      "/delivery/message-templates": () =>
        new Response("<html>bad gateway</html>", { status: 502 }),
    });

    await expect(fetchMessageTemplates(SESSION_BUSINESS)).rejects.toThrow(
      "Não foi possível carregar as mensagens ao cliente.",
    );
  });

  it("reads an answer without rows as nothing written yet", async () => {
    stubRelay({ "/delivery/message-templates": () => ({}) });

    await expect(fetchMessageTemplates(SESSION_BUSINESS)).resolves.toEqual([]);
  });
});
