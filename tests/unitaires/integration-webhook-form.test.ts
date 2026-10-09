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
 * The webhook form (Entregas 14; DLVB-22, DLVB-25, REV-9, CRIT-24).
 *
 * "Todos os eventos" of Documentos saved `document.*`, which the dispatcher
 * matches against no topic — the endpoint received nothing — and the boxes
 * showed unchecked and dimmed. Editing kept Salvar enabled on an untouched
 * form, "Eventos *" had a grey asterisk on a label of nothing, and the
 * switch said "para de enviar" without saying the paused events are lost.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const api = vi.hoisted(() => ({
  saved: [] as Array<{ payload: Record<string, unknown>; id?: string }>,
}));

const CATALOGUE = {
  version: "v1",
  topics: [
    {
      topic: "route.released",
      family: "route",
      description: "A rota foi liberada para o motorista.",
    },
    {
      topic: "route.started",
      family: "route",
      description: "O motorista saiu com a rota.",
    },
    {
      topic: "delivery.created",
      family: "document",
      description: "Uma entrega entrou na operação.",
    },
    {
      topic: "delivery.delivered",
      family: "document",
      description: "A entrega foi concluída.",
    },
    {
      topic: "occurrence.reported",
      family: "document",
      description: "Uma ocorrência foi registrada.",
    },
    {
      topic: "proof.registered",
      family: "document",
      description: "O motorista enviou o canhoto.",
    },
  ],
  scopes: [],
};

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

vi.mock("@/actions/integration", () => ({
  getIntegrationCatalogue: async () => ({
    success: true,
    message: "",
    data: CATALOGUE,
  }),
  saveWebhookEndpoint: async (
    _businessId: string,
    payload: Record<string, unknown>,
    id?: string,
  ) => {
    api.saved.push({ payload, id });

    return {
      success: true,
      message: id ? "Endpoint atualizado." : "Endpoint criado.",
      data: { id: id ?? "wh-1", secret: id ? null : "whsec_segredo_de_teste" },
    };
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { WebhookFormDialog } from "@/features/integrations/webhooks/form-dialog";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

let root: Root | null = null;
let closed = 0;

beforeEach(() => {
  api.saved.length = 0;
  closed = 0;
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

const EXISTING = {
  id: "wh-9",
  name: "ERP do embarcador",
  url: "https://erp.exemplo.com.br/hook",
  topics: ["route.*"],
  is_active: true,
  disabled_at: null,
  consecutive_failures: 0,
  created_at: "2026-09-01T12:00:00.000Z",
};

async function open(endpoint: typeof EXISTING | null = null): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    root!.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(WebhookFormDialog, {
          businessId: "018f0000-0000-7000-8000-00000000000b",
          endpoint,
          isOpen: true,
          onClose: () => {
            closed += 1;
          },
          onSaved: () => undefined,
        }),
      ),
    );
  });

  await settle();
}

async function type(input: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;

  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function button(
  label: RegExp,
  scope: ParentNode = document,
): HTMLButtonElement {
  const found = [...scope.querySelectorAll("button")].find((candidate) =>
    label.test(candidate.textContent ?? ""),
  );

  expect(found, `botão ${label} não encontrado`).toBeDefined();

  return found as HTMLButtonElement;
}

async function click(target: HTMLElement): Promise<void> {
  await act(async () => target.click());
  await settle();
}

/** The checkbox of a topic, native or not, and whether it shows checked. */
function box(topic: string): { element: HTMLElement; checked: boolean } {
  const label = [...document.querySelectorAll("label")].find((candidate) =>
    [...candidate.querySelectorAll("span")].some(
      (span) => span.textContent === topic,
    ),
  );

  expect(label, `o evento ${topic} não está na tela`).toBeDefined();

  const element = label!.querySelector<HTMLElement>(
    '[role="checkbox"], input[type="checkbox"]',
  )!;

  const checked =
    element.getAttribute("aria-checked") === "true" ||
    (element as HTMLInputElement).checked === true;

  return { element, checked };
}

/** "Todos os eventos" of a family, found by the family's title. */
function familyToggle(title: string): HTMLButtonElement {
  const heading = [...document.querySelectorAll("p, legend, span, h3")].find(
    (candidate) =>
      candidate.textContent?.trim().toLowerCase() === title.toLowerCase(),
  );

  expect(heading, `família ${title} não encontrada`).toBeDefined();

  return button(/todos os eventos/i, heading!.closest("div")!.parentElement!);
}

const DOCUMENT_TOPICS = [
  "delivery.created",
  "delivery.delivered",
  "occurrence.reported",
  "proof.registered",
];

describe("Todos os eventos of Documentos (DLVB-22)", () => {
  it("checks every document topic on screen", async () => {
    await open();

    await click(familyToggle("Documentos"));

    for (const topic of DOCUMENT_TOPICS) {
      expect(box(topic).checked, `${topic} ficou desmarcado`).toBe(true);
    }

    for (const topic of ["route.released", "route.started"]) {
      expect(box(topic).checked, topic).toBe(false);
    }
  });

  it("subscribes to delivery.*, occurrence.* and proof.*, never document.*", async () => {
    await open();

    await type(
      document.getElementById("webhook-name") as HTMLInputElement,
      "ERP do embarcador",
    );
    await type(
      document.getElementById("webhook-url") as HTMLInputElement,
      "https://erp.exemplo.com.br/hook",
    );

    await click(box("delivery.created").element);
    await click(familyToggle("Documentos"));
    await click(button(/criar endpoint/i));

    expect(api.saved).toHaveLength(1);
    expect([...(api.saved[0].payload.topics as string[])].sort()).toEqual([
      "delivery.*",
      "occurrence.*",
      "proof.*",
    ]);
  });
});

describe("editing an endpoint (REV-9, decision 2.5)", () => {
  it("keeps Salvar disabled until something changes", async () => {
    await open(EXISTING);

    const save = () => button(/^\s*salvar\s*$/i);

    expect(save().disabled, "Salvar habilitado sem nenhuma mudança").toBe(true);

    const name = document.getElementById("webhook-name") as HTMLInputElement;

    await type(name, "ERP do embarcador 2");
    expect(save().disabled).toBe(false);

    await type(name, "ERP do embarcador");
    expect(save().disabled).toBe(true);
  });

  it("opens a legacy document.* subscription as the three wildcards, and can save it", async () => {
    await open({ ...EXISTING, topics: ["document.*"] });

    for (const topic of DOCUMENT_TOPICS) {
      expect(box(topic).checked, topic).toBe(true);
    }

    await type(
      document.getElementById("webhook-name") as HTMLInputElement,
      "ERP renomeado",
    );
    await click(button(/^\s*salvar\s*$/i));

    expect(api.saved).toHaveLength(1);
    expect(api.saved[0].id).toBe("wh-9");
    expect([...(api.saved[0].payload.topics as string[])].sort()).toEqual([
      "delivery.*",
      "occurrence.*",
      "proof.*",
    ]);
  });
});

describe("a subscription the checkboxes cannot express (DLVB-22)", () => {
  it("shows a lone family prefix on its own, and removing it frees the topics", async () => {
    await open({ ...EXISTING, topics: ["delivery.*"] });

    // Covered, and locked while the prefix holds them.
    expect(box("delivery.created").checked).toBe(true);
    expect(box("delivery.created").element.hasAttribute("disabled")).toBe(true);

    const chips = document.querySelector('[data-partial-wildcards="document"]');

    expect(chips?.textContent).toContain("delivery.*");

    await click(
      chips!.querySelector<HTMLButtonElement>(
        'button[aria-label="Remover a assinatura delivery.*"]',
      )!,
    );

    expect(
      document.querySelector('[data-partial-wildcards="document"]'),
    ).toBeNull();
    expect(box("delivery.created").checked).toBe(false);
    expect(box("delivery.created").element.hasAttribute("disabled")).toBe(
      false,
    );

    await click(box("occurrence.reported").element);
    await click(button(/^\s*salvar\s*$/i));

    expect(api.saved).toHaveLength(1);
    expect(api.saved[0].payload.topics).toEqual(["occurrence.reported"]);
  });

  it("lists what the catalogue no longer knows, blocks the save until it is removed", async () => {
    await open({ ...EXISTING, topics: ["route.*", "vehicle.moved"] });

    const block = document.querySelector("[data-unknown-subscriptions]");

    expect(block?.textContent).toContain("vehicle.moved");
    expect(block?.textContent).toMatch(/Assinaturas não reconhecidas/);

    await type(
      document.getElementById("webhook-name") as HTMLInputElement,
      "ERP renomeado",
    );
    await click(button(/^\s*salvar\s*$/i));

    expect(api.saved).toHaveLength(0);
    expect(
      document.getElementById("webhook-topics-error")?.textContent,
    ).toMatch(/Remova as assinaturas não reconhecidas/);

    await click(
      document.querySelector<HTMLButtonElement>(
        'button[aria-label="Remover a assinatura vehicle.moved"]',
      )!,
    );

    expect(document.querySelector("[data-unknown-subscriptions]")).toBeNull();

    await click(button(/^\s*salvar\s*$/i));

    expect(api.saved).toHaveLength(1);
    expect(api.saved[0].payload.topics).toEqual(["route.*"]);
  });
});

describe("the form's fields", () => {
  it("names Eventos as a required group, with its error under it", async () => {
    await open();

    const legend = document.querySelector("fieldset#webhook-topics legend");

    expect(legend?.textContent).toMatch(/^Eventos \*/);
    expect(legend?.querySelector("span.text-red-600")).not.toBeNull();

    await type(
      document.getElementById("webhook-name") as HTMLInputElement,
      "ERP",
    );
    await type(
      document.getElementById("webhook-url") as HTMLInputElement,
      "https://erp.exemplo.com.br/hook",
    );
    await click(button(/criar endpoint/i));

    expect(api.saved).toHaveLength(0);
    expect(
      document.getElementById("webhook-topics-error")?.textContent,
    ).toMatch(/ao menos um evento/);
  });

  it("refuses an address that can never receive, under the field", async () => {
    await open();

    await type(
      document.getElementById("webhook-name") as HTMLInputElement,
      "ERP",
    );
    await type(
      document.getElementById("webhook-url") as HTMLInputElement,
      "https://localhost/hook",
    );
    await click(box("route.started").element);
    await click(button(/criar endpoint/i));

    expect(api.saved).toHaveLength(0);
    expect(
      document.getElementById("webhook-url")?.getAttribute("aria-invalid"),
    ).toBe("true");
    expect(document.getElementById("webhook-url-error")?.textContent).toMatch(
      /alcançável pela internet/,
    );
  });

  it("says what pausing does to the events of the pause", async () => {
    await open();

    expect(document.body.textContent).toMatch(
      /acontecerem com ele pausado não são enviados depois/,
    );
  });
});

describe("the secret of a new endpoint", () => {
  it("is shown in the copy field, and ESC asks before losing it", async () => {
    await open();

    await type(
      document.getElementById("webhook-name") as HTMLInputElement,
      "ERP",
    );
    await type(
      document.getElementById("webhook-url") as HTMLInputElement,
      "https://erp.exemplo.com.br/hook",
    );
    await click(box("route.started").element);
    await click(button(/criar endpoint/i));

    expect(document.querySelector("[data-copy-field]")?.textContent).toContain(
      "whsec_segredo_de_teste",
    );

    await act(async () => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    await settle();

    expect(closed).toBe(0);
    expect(document.body.textContent).toMatch(/Fechar sem guardar\?/);
  });
});
