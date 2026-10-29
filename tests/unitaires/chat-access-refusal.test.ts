import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryClientProps } from "@/lib/query-client-props";

import { refusal, stubRelay } from "./helpers/relay-fetch";

/**
 * The chat's conversation list refused with a 403 (decision 4.1, DLV-RO-1).
 *
 * The action flagged every 403 as `moduleDisabled`, and nothing read it:
 * a profile whose Entregas read was revoked while the tab was open, or a
 * company deactivated meanwhile, got the list's red "erro ao carregar" and a
 * retry button that could only fail again. The refusal is now classified by
 * the API's code and the panel draws that state.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));
vi.mock("@/lib/log-action-error", () => ({ logActionError: () => undefined }));

function answer(status: number, body: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listChatThreads", () => {
  it("names each 403 by the API's code", async () => {
    const { listChatThreads } =
      await import("@/actions/chat/list-chat-threads");

    answer(403, {
      code: "PERMISSION_DENIED",
      message: "Seu perfil permite apenas a leitura.",
    });

    expect((await listChatThreads({})).accessError).toEqual({
      kind: "permission-denied",
      message: "Seu perfil permite apenas a leitura.",
    });

    answer(403, {
      code: "MODULE_NOT_ENABLED",
      message: "Módulo desabilitado.",
    });

    expect((await listChatThreads({})).accessError?.kind).toBe(
      "module-not-enabled",
    );

    answer(403, { code: "TENANT_INACTIVE", message: "Empresa desativada." });

    expect((await listChatThreads({})).accessError?.kind).toBe(
      "tenant-inactive",
    );
  });

  it("says nothing about access for a failure that is not a 403", async () => {
    const { listChatThreads } =
      await import("@/actions/chat/list-chat-threads");

    answer(500, { message: "Falhou." });

    const result = await listChatThreads({});

    expect(result.success).toBe(false);
    expect(result.accessError ?? null).toBeNull();
  });
});

// ------------------------------------------------------------------ panel

// Decision 14.5: the panel lists tickets now (a relay read of /chat/tickets,
// lib/chat-reads); the same refusal rules apply to the API's 403.
vi.mock("@/features/deliveries/chat/lib/use-chat-unread", () => ({
  THREADS_REFRESH_COALESCE_MS: 500,
  useTicketsSummary: () => null,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => undefined, push: () => undefined }),
  usePathname: () => "/dashboard/deliveries",
  useSearchParams: () => new URLSearchParams("tab=chat"),
}));
vi.mock("@/socket", () => ({
  initializeSocket: () => new Promise(() => undefined),
  getSocket: () => null,
  onRealtimeResync: () => () => undefined,
}));
vi.mock("@/store/auth-store", () => ({
  useAuthStore: (select: (state: { id: string; role: string }) => unknown) =>
    select({ id: "u1", role: "BUSINESS_USER" }),
}));
vi.mock("@/lib/check-multiple-permissions", () => ({
  useCheckMultiplePermissions: () => ({ hasAllPermissions: true }),
  getPermissionName: () => "Gerenciar Entregas",
}));
vi.mock("@/features/deliveries/chat/lib/use-chat-socket", () => ({
  useChatSubscription: () => undefined,
}));
vi.mock("@/features/deliveries/chat/tickets/ticket-list", () => ({
  TicketList: ({ errorMessage }: { errorMessage: string }) =>
    createElement("aside", { "data-thread-list": errorMessage || "ok" }),
}));
vi.mock("@/features/deliveries/chat/tickets/ticket-header", () => ({
  TicketHeader: () => null,
}));
vi.mock("@/features/deliveries/chat/tickets/new-ticket-dialog", () => ({
  NewTicketDialog: () => null,
}));
vi.mock("@/features/deliveries/chat/conversation", () => ({
  Conversation: () => null,
}));

describe("ChatPanel", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(async () => {
    if (root) await act(async () => root!.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  async function renderPanel(): Promise<void> {
    const { ChatPanel } = await import("@/features/deliveries/chat");

    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    // The app's own retry rule (one more try, transient failures only),
    // without its one-second pause.
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          ...queryClientProps.getDefaultOptions().queries,
          retryDelay: 1,
        },
      },
    });

    await act(async () => {
      root!.render(
        createElement(
          QueryClientProvider,
          { client },
          createElement(ChatPanel, {}),
        ),
      );
    });

    await act(async () => {
      await new Promise((done) => setTimeout(done, 80));
    });
  }

  it("draws a revoked permission as such, asked once", async () => {
    const relay = stubRelay({
      "/chat/tickets": () =>
        refusal(403, {
          code: "PERMISSION_DENIED",
          message: "Seu perfil não inclui Gerenciar Entregas.",
        }),
    });

    await renderPanel();

    const text = document.body.textContent ?? "";

    expect(text).toContain("Sem permissão para esta seção");
    expect(text).toContain("Seu perfil não inclui Gerenciar Entregas.");
    expect(text).not.toContain("não contratado");

    // Not the list's generic error with a retry that can only fail again.
    expect(document.querySelector("[data-thread-list]")).toBeNull();
    expect(relay.callsTo("/chat/tickets")).toHaveLength(1);
  });

  it("draws the module state only for MODULE_NOT_ENABLED", async () => {
    stubRelay({
      "/chat/tickets": () =>
        refusal(403, {
          code: "MODULE_NOT_ENABLED",
          message: "Módulo desabilitado.",
        }),
    });

    await renderPanel();

    expect(document.body.textContent).toContain(
      "Módulo Entregas não contratado",
    );
  });

  it("keeps the list's own error for a failure that is not about access", async () => {
    stubRelay({
      "/chat/tickets": () =>
        refusal(500, { message: "Houve um erro ao carregar as conversas." }),
    });

    await renderPanel();

    expect(
      document
        .querySelector("[data-thread-list]")
        ?.getAttribute("data-thread-list"),
    ).toBe("Houve um erro ao carregar as conversas.");
  });
});
