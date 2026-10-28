import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubRelay } from "./helpers/relay-fetch";

/**
 * The chat's two pickers — "Nova conversa" and "Aviso em massa" — on the
 * chat's own recipients list (DLVP-BCAST-2) and the notice's audience and
 * outcomes (decision 6.8, DLVP-BCAST-3).
 *
 * Before, both read `/driver/search-driver-business` (driver_manage:read),
 * filtered only what had been loaded, counted drivers without the app as
 * reached, and sent no key when one driver was picked. Then: "everyone" went
 * out on one click, stayed selectable past the 500 the API accepts, and the
 * pickers showed each driver's CNH to anyone with delivery_manage.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

const actions = vi.hoisted(() => ({
  sendChatMessage: vi.fn(),
  toasts: [] as Array<[string, string]>,
}));

vi.mock("@/actions/chat/send-chat-message", () => ({
  sendChatMessage: (...args: unknown[]) => actions.sendChatMessage(...args),
}));
vi.mock("@/features/deliveries/hooks/use-deliveries-business-id", () => ({
  useDeliveriesBusinessId: () => "b1",
}));
vi.mock("sonner", () => ({
  toast: Object.assign(
    (message: string) => actions.toasts.push(["info", message]),
    {
      error: (message: string) => actions.toasts.push(["error", message]),
      success: (message: string) => actions.toasts.push(["success", message]),
      warning: (message: string) => actions.toasts.push(["warning", message]),
    },
  ),
}));

const WITH_APP = [
  { id: "d1", name: "João", hasApp: true },
  { id: "d2", name: "Maria", hasApp: true },
];
const WITHOUT_APP = [{ id: "d3", name: "Beto", hasApp: false }];

/** What the API counts company-wide; each test may change it. */
let audience = { withApp: 2, withoutApp: 1 };

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

let root: Root | null = null;
let host: HTMLDivElement | null = null;

/**
 * The recipients are a relay read of /chat/recipients (lib/chat-reads). The
 * picker used to reach the driver registry through a raw fetch; any read
 * other than the chat's own list is a failure here.
 */
let relay: ReturnType<typeof stubRelay>;

async function render(element: React.ReactElement): Promise<HTMLElement> {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    root!.render(createElement(QueryClientProvider, { client }, element));
  });

  return document.body;
}

async function settle(ms = 50): Promise<void> {
  await act(async () => {
    await sleep(ms);
  });
}

function button(label: string | RegExp): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find((node) =>
    typeof label === "string"
      ? node.getAttribute("aria-label") === label ||
        node.textContent?.trim() === label
      : label.test(node.textContent ?? ""),
  );

  if (!found) throw new Error(`botão não encontrado: ${label}`);

  return found as HTMLButtonElement;
}

beforeEach(() => {
  audience = { withApp: 2, withoutApp: 1 };
  actions.toasts.length = 0;
  actions.sendChatMessage.mockReset();

  relay = stubRelay({
    "/chat/recipients": (url) => {
      const app = url.searchParams.get("app");
      const search = url.searchParams.get("search");

      const pool =
        app === "WITH_APP"
          ? WITH_APP
          : app === "WITHOUT_APP"
            ? WITHOUT_APP
            : [...WITH_APP, ...WITHOUT_APP];

      return {
        data: pool.filter(
          (row) =>
            !search || row.name.toLowerCase().includes(search.toLowerCase()),
        ),
        nextCursor: null,
        hasMore: false,
        audience,
      };
    },
  });
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  document.body.innerHTML = "";

  root = null;
  host = null;

  vi.unstubAllGlobals();
});

describe("the Nova conversa popover", () => {
  it("lists the chat's recipients and searches them on the server", async () => {
    const { NewConversationPopover } =
      await import("@/features/deliveries/chat/new-conversation-popover");

    await render(
      createElement(NewConversationPopover, {
        canWrite: true,
        onPickDriver: () => undefined,
      }),
    );

    await act(async () => {
      button("Nova conversa").click();
    });

    await settle(100);

    expect(document.body.textContent).toContain("João");
    expect(document.body.textContent).toContain("Sem o aplicativo");

    // Only the fields of the choice: no registration data on screen.
    expect(document.body.textContent).not.toContain("CNH");

    const input = document.querySelector<HTMLInputElement>("input")!;

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      setValue.call(input, "mar");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await settle(450);

    expect(
      relay
        .callsTo("/chat/recipients")
        .some(
          ({ query }) =>
            query.get("businessId") === "b1" && query.get("search") === "mar",
        ),
    ).toBe(true);
    expect(relay.calls.map(({ path }) => path)).toEqual(
      relay.calls.map(() => "/chat/recipients"),
    );
  });
});

describe("the Aviso em massa dialog", () => {
  async function openDialog() {
    const { BroadcastDialog } =
      await import("@/features/deliveries/chat/broadcast-dialog");

    await render(
      createElement(BroadcastDialog, {
        canWrite: true,
        onSent: () => undefined,
      }),
    );

    await act(async () => {
      button("Aviso em massa").click();
    });

    await settle(100);
  }

  async function type(text: string) {
    const area =
      document.querySelector<HTMLTextAreaElement>("#broadcast-text")!;

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )!.set!;
      setValue.call(area, text);
      area.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  it("sends to everyone with the app by default, after a confirmation, with a key", async () => {
    actions.sendChatMessage.mockResolvedValue({
      success: true,
      message: "",
      data: {
        data: [],
        outcomes: [],
        summary: { sent: 2, alreadySent: 0, skippedNoApp: 0 },
      },
    });

    await openDialog();

    expect(document.body.textContent).toContain(
      "Todos os motoristas ativos com o app (2)",
    );
    expect(document.body.textContent).toContain("Sem o aplicativo (1)");
    expect(document.body.textContent).toContain("Beto");

    // Beto is listed, never offered: no checkbox carries his name.
    expect(document.querySelector('[aria-label="Selecionar Beto"]')).toBeNull();

    await type("Balança na BR-101");

    await act(async () => {
      button(/Enviar para 2 motoristas/).click();
    });

    await settle();

    // One click only asks: "everyone" used to go out right here.
    expect(actions.sendChatMessage).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "tocar o celular de 2 motoristas",
    );

    await act(async () => {
      button(/Confirmar envio para 2 motoristas/).click();
    });

    await settle();

    expect(actions.sendChatMessage).toHaveBeenCalledTimes(1);

    const [request] = actions.sendChatMessage.mock.calls[0];

    expect(request).toMatchObject({
      audience: "ALL_ACTIVE_WITH_APP",
      kind: "TEXT",
      body: "Balança na BR-101",
    });
    expect(request.driverIds).toBeUndefined();
    expect(request.broadcastKey).toMatch(/^[0-9a-f-]{36}$/);

    expect(actions.toasts).toContainEqual([
      "success",
      "Aviso enviado para 2 motoristas.",
    ]);
  });

  it("withdraws the confirmation when the text changes", async () => {
    await openDialog();
    await type("Primeira versão");

    await act(async () => {
      button(/Enviar para 2 motoristas/).click();
    });

    await type("Segunda versão");

    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(button(/Enviar para 2 motoristas/)).toBeTruthy();
    expect(actions.sendChatMessage).not.toHaveBeenCalled();
  });

  it.each([
    [
      { withApp: 501, withoutApp: 0 },
      "Mais de 500 motoristas com o app: escolha os destinatários.",
    ],
    [{ withApp: 0, withoutApp: 1 }, "Nenhum motorista ativo tem o aplicativo."],
  ])('closes "everyone" when it cannot be sent (%o)', async (count, reason) => {
    audience = count;

    await openDialog();

    const all = document.querySelector<HTMLButtonElement>("#broadcast-all")!;

    // Before: still selectable (and selected) — 501 went to the API and came
    // back CHAT_BROADCAST_TOO_LARGE; 0 sat on a disabled, checked radio.
    expect(all.disabled).toBe(true);
    expect(all.getAttribute("aria-checked")).toBe("false");
    expect(document.getElementById("broadcast-all-reason")?.textContent).toBe(
      reason,
    );
    expect(all.getAttribute("aria-describedby")).toBe("broadcast-all-reason");

    expect(
      document
        .querySelector<HTMLButtonElement>("#broadcast-pick")!
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(button("Selecione os motoristas").disabled).toBe(true);
  });

  it("keys a notice to a single chosen driver, and reports who was left out", async () => {
    actions.sendChatMessage.mockResolvedValue({
      success: true,
      message: "",
      data: {
        data: [],
        outcomes: [],
        summary: { sent: 1, alreadySent: 0, skippedNoApp: 1 },
      },
    });

    await openDialog();

    await act(async () => {
      document.querySelector<HTMLButtonElement>("#broadcast-pick")!.click();
    });

    await settle(100);

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="Selecionar João"]')!
        .click();
    });

    await type("Só para o João");

    await act(async () => {
      button(/Enviar para 1 motorista/).click();
    });

    await settle();

    const [request] = actions.sendChatMessage.mock.calls[0];

    // Before: one driver meant no key at all, and a retry duplicated it.
    expect(request).toMatchObject({ driverIds: ["d1"] });
    expect(request.broadcastKey).toMatch(/^[0-9a-f-]{36}$/);

    expect(actions.toasts).toContainEqual([
      "warning",
      "Aviso enviado para 1 motorista. 1 motorista sem o aplicativo ficou de fora.",
    ]);
  });
});
