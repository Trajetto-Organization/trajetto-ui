import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

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
 * A one-time secret, after it was copied (UI-core wave-1 note, DLVB-23).
 *
 * ESC and the X ask "Fechar sem guardar?" while a key or a webhook secret is
 * on screen, because closing by reflex loses it for good. CopyField gained an
 * `onCopied` callback for this, but the reveal never passed it: the guard kept
 * asking after a successful copy, accusing the person of not keeping what
 * they had just kept. Driven through the real "Nova chave de API" dialog; the
 * reveal and the guard are shared by the three secret dialogs.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

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

import { QueryClient, QueryClientProvider } from "react-query";

import { ApiKeyDialog } from "@/features/integrations/api-keys/create-dialog";
import {
  SecretReveal,
  useConfirmBeforeClosingSecret,
} from "@/features/integrations/components/secret-reveal";
import { WebhookFormDialog } from "@/features/integrations/webhooks/form-dialog";
import { RotateSecretDialog } from "@/features/integrations/webhooks/rotate-secret-dialog";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

let root: Root | null = null;
let closed = 0;
const writeText = vi.fn<[string], Promise<void>>();

beforeEach(() => {
  closed = 0;
  writeText.mockReset();

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function click(target: HTMLElement): Promise<void> {
  await act(async () => target.click());
  await settle();
}

function button(name: RegExp): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find(
    (candidate) =>
      name.test(candidate.textContent ?? "") ||
      name.test(candidate.getAttribute("aria-label") ?? ""),
  );

  expect(found, `botão ${name} não encontrado`).toBeDefined();

  return found as HTMLButtonElement;
}

/** Opens the dialog and issues a key, so the one-time value is on screen. */
async function issueKey(): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(
      createElement(ApiKeyDialog, {
        businessId: "018f0000-0000-7000-8000-00000000000b",
        isOpen: true,
        mode: "dashboard",
        onClose: () => {
          closed += 1;
        },
        onCreated: () => undefined,
      }),
    );
  });
  await settle();

  const name = document.getElementById("api-key-name") as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;

  await act(async () => {
    setter.call(name, "ERP Protheus");
    name.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await click(button(/emitir chave/i));

  expect(document.querySelector("[data-copy-field]")?.textContent).toContain(
    "tjk_live_abc.segredo",
  );
}

async function pressEscape(): Promise<void> {
  await act(async () => {
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });
  await settle();
}

describe("closing a one-time secret", () => {
  it("does not ask again once the value was copied", async () => {
    writeText.mockResolvedValue(undefined);

    await issueKey();
    await click(button(/copiar a chave/i));

    expect(writeText).toHaveBeenCalledWith("tjk_live_abc.segredo");

    await pressEscape();

    expect(document.body.textContent).not.toMatch(/Fechar sem guardar\?/);
    expect(closed, "ESC depois de copiar deveria fechar").toBe(1);
  });

  it("still asks when the copy was refused", async () => {
    writeText.mockRejectedValue(new Error("denied"));

    await issueKey();
    await click(button(/copiar a chave/i));
    await pressEscape();

    expect(closed).toBe(0);
    expect(document.body.textContent).toMatch(/Fechar sem guardar\?/);
  });

  it("still asks when nothing was copied", async () => {
    await issueKey();
    await pressEscape();

    expect(closed).toBe(0);
    expect(document.body.textContent).toMatch(/Fechar sem guardar\?/);
  });
});

/**
 * The two webhook secrets go through the same reveal and guard. Each dialog
 * owns both, so each one has to hand the guard's `markCopied` to the reveal:
 * proven here on the real dialogs, not on the shared parts alone.
 */
describe("closing a webhook secret after copying it", () => {
  const ENDPOINT = {
    id: "wh-9",
    name: "ERP do embarcador",
    url: "https://erp.exemplo.com.br/hook",
    topics: ["route.*"],
    is_active: true,
    disabled_at: null,
    consecutive_failures: 0,
    created_at: "2026-09-01T12:00:00.000Z",
  };

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

  it("a new endpoint's secret closes on ESC once copied", async () => {
    writeText.mockResolvedValue(undefined);

    await mount(
      createElement(WebhookFormDialog, {
        businessId: "018f0000-0000-7000-8000-00000000000b",
        endpoint: null,
        isOpen: true,
        onClose: () => {
          closed += 1;
        },
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

    expect(document.querySelector("[data-copy-field]")?.textContent).toContain(
      "whsec_do_endpoint",
    );

    await click(button(/copiar o segredo/i));
    await pressEscape();

    expect(document.body.textContent).not.toMatch(/Fechar sem guardar\?/);
    expect(closed, "ESC depois de copiar deveria fechar").toBe(1);
  });

  it("a rotated secret closes on ESC once copied", async () => {
    writeText.mockResolvedValue(undefined);

    await mount(
      createElement(RotateSecretDialog, {
        businessId: "018f0000-0000-7000-8000-00000000000b",
        endpoint: ENDPOINT,
        isOpen: true,
        onClose: () => {
          closed += 1;
        },
      }),
    );

    await click(button(/gerar novo segredo/i));

    expect(document.querySelector("[data-copy-field]")?.textContent).toContain(
      "whsec_rotacionado",
    );

    await click(button(/copiar o segredo/i));
    await pressEscape();

    expect(document.body.textContent).not.toMatch(/Fechar sem guardar\?/);
    expect(closed, "ESC depois de copiar deveria fechar").toBe(1);
  });

  it("a rotated secret still asks when nothing was copied", async () => {
    await mount(
      createElement(RotateSecretDialog, {
        businessId: "018f0000-0000-7000-8000-00000000000b",
        endpoint: ENDPOINT,
        isOpen: true,
        onClose: () => {
          closed += 1;
        },
      }),
    );

    await click(button(/gerar novo segredo/i));
    await pressEscape();

    expect(closed).toBe(0);
    expect(document.body.textContent).toMatch(/Fechar sem guardar\?/);
  });
});

/**
 * The wiring the three dialogs use: the dialog owns the guard and the
 * reveal, so the reveal's `onCopied` feeds the guard's `markCopied`. Each
 * half is proven on its own here — no reveal is mounted in the guard's test,
 * and the reveal's test only watches its callback.
 */
describe("the explicit copy wiring", () => {
  let guard: ReturnType<typeof useConfirmBeforeClosingSecret> | null = null;

  function Guard({ isRevealing }: { isRevealing: boolean }): JSX.Element {
    guard = useConfirmBeforeClosingSecret({
      isRevealing,
      onClose: () => {
        closed += 1;
      },
      what: "a chave",
    });

    return guard.guard;
  }

  async function renderGuard(isRevealing: boolean): Promise<void> {
    if (!root) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      root = createRoot(host);
    }

    await act(async () => root!.render(createElement(Guard, { isRevealing })));
    await settle();
  }

  async function dismiss(): Promise<void> {
    await act(async () => guard!.handleOpenChange(false));
    await settle();
  }

  it("the guard stops asking once markCopied was called, and forgets it with the value", async () => {
    await renderGuard(true);
    await dismiss();

    expect(closed).toBe(0);
    expect(guard!.isAsking).toBe(true);

    await act(async () => guard!.markCopied());
    await dismiss();

    expect(closed, "ESC depois de markCopied deveria fechar").toBe(1);

    // The reveal was left; the next value on screen was not copied.
    await renderGuard(false);
    await renderGuard(true);
    await dismiss();

    expect(closed).toBe(1);
  });

  async function renderReveal(onCopied: () => void): Promise<void> {
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root!.render(
        createElement(SecretReveal, {
          value: "whsec_segredo",
          label: "o segredo",
          fieldLabel: "Segredo de assinatura",
          successMessage: "Segredo copiado.",
          warning: "Esta é a única vez que o segredo aparece.",
          doneLabel: "Já guardei",
          onDone: () => undefined,
          onCopied,
        }),
      );
    });
    await settle();
  }

  it("the reveal reports a successful copy, and only a successful one", async () => {
    const onCopied = vi.fn();

    writeText.mockResolvedValue(undefined);
    await renderReveal(onCopied);
    await click(button(/copiar o segredo/i));

    expect(writeText).toHaveBeenCalledWith("whsec_segredo");
    expect(onCopied).toHaveBeenCalledTimes(1);

    await act(async () => root?.unmount());
    root = null;
    onCopied.mockReset();
    writeText.mockRejectedValue(new Error("denied"));

    await renderReveal(onCopied);
    await click(button(/copiar o segredo/i));

    expect(onCopied).not.toHaveBeenCalled();
  });
});
