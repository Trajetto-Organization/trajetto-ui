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
 * "Nova chave de API" (Entregas 13; DLVB-20, DLVB-21, UI-MODAL-8).
 *
 * The rate was an `<input type="number">`: `--`, `++` and `e` were accepted,
 * the browser handed over an empty string and `Number("") || 120` issued a
 * key at 120 a minute nobody typed. Validation was a toast, not the field;
 * "Nome" and "Escopos" had no red asterisk and the rate no "(opcional)"; the
 * footer did not fill the modal; ESC closed the one view that shows the key.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const api = vi.hoisted(() => ({
  created: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

vi.mock("@/actions/integration", () => ({
  createApiKey: async (
    _businessId: string,
    payload: Record<string, unknown>,
  ) => {
    api.created.push(payload);

    return {
      success: true,
      message: "Chave criada.",
      data: {
        id: "key-1",
        prefix: "tjk_live_abc",
        token: "tjk_live_abc.segredo",
      },
    };
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ApiKeyDialog } from "@/features/integrations/api-keys/create-dialog";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

let root: Root | null = null;
let closed = 0;

beforeEach(() => {
  api.created.length = 0;
  closed = 0;
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

async function open(): Promise<void> {
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
}

/** Types into a controlled input the way React listens for it. */
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

const input = (id: string) => document.getElementById(id) as HTMLInputElement;

function button(label: RegExp): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find((candidate) =>
    label.test(candidate.textContent ?? ""),
  );

  expect(found, `botão ${label} não encontrado`).toBeDefined();

  return found as HTMLButtonElement;
}

async function click(target: HTMLElement): Promise<void> {
  await act(async () => target.click());
  await settle();
}

describe("the rate per minute", () => {
  it("keeps only digits of whatever is typed", async () => {
    await open();

    await type(input("api-key-rate"), "--5");
    expect(input("api-key-rate").value).toBe("5");

    await type(input("api-key-rate"), "1e3");
    expect(input("api-key-rate").value).toBe("13");

    await type(input("api-key-rate"), "12.5");
    expect(input("api-key-rate").value).toBe("125");
  });

  it("says a value below the minimum under the field, and sends nothing", async () => {
    await open();

    await type(input("api-key-name"), "ERP Protheus");
    await type(input("api-key-rate"), "5");
    await click(button(/emitir chave/i));

    expect(api.created).toHaveLength(0);

    expect(input("api-key-rate").getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById("api-key-rate-error")?.textContent).toMatch(
      /mínimo é de 10/,
    );
  });

  it("sends no number the person did not type: empty means the API's default", async () => {
    await open();

    await type(input("api-key-name"), "ERP Protheus");
    await type(input("api-key-rate"), "");
    await click(button(/emitir chave/i));

    expect(api.created).toHaveLength(1);
    expect(api.created[0]).not.toHaveProperty("rate_limit_per_minute");
    expect(api.created[0]).toMatchObject({
      name: "ERP Protheus",
      scopes: ["deliveries:read"],
    });
  });
});

describe("the form's labels and errors", () => {
  it("marks Nome and Escopos required and the rate optional", async () => {
    await open();

    const nameLabel = document.querySelector('label[for="api-key-name"]');

    expect(nameLabel?.textContent).toMatch(/^Nome \*$/);
    expect(nameLabel?.querySelector("span.text-red-600")).not.toBeNull();

    const legend = document.querySelector("fieldset#api-key-scopes legend");

    expect(legend?.textContent).toMatch(/^Escopos \*/);

    expect(
      document.querySelector('label[for="api-key-rate"]')?.textContent,
    ).toBe("Limite por minuto (opcional)");

    expect(input("api-key-rate").getAttribute("type")).toBe("text");
    expect(input("api-key-rate").getAttribute("inputmode")).toBe("numeric");
  });

  it("shows a missing name and no scope under the fields, not in a toast", async () => {
    await open();

    const scope = document.querySelector<HTMLButtonElement>(
      'fieldset#api-key-scopes [role="checkbox"][aria-checked="true"]',
    );

    expect(scope, "o escopo de leitura de entregas vem marcado").not.toBeNull();
    await click(scope!);

    await click(button(/emitir chave/i));

    expect(api.created).toHaveLength(0);
    expect(input("api-key-name").getAttribute("aria-invalid")).toBe("true");
    expect(
      document.getElementById("api-key-scopes-error")?.textContent,
    ).toMatch(/ao menos um escopo/);
  });

  it("offers the write scope and not the reserved one", async () => {
    await open();

    const offered = [
      ...document.querySelectorAll('fieldset#api-key-scopes [role="checkbox"]'),
    ].map((box) => box.getAttribute("value") ?? box.id);

    // Decision 5.10: POST /integration/v1/deliveries exists now.
    expect(offered).toContain("deliveries:write");
    expect(offered.join(" ")).not.toMatch(/manage/);
  });

  it("issues a write-only key for an ERP that only pushes", async () => {
    await open();

    await type(input("api-key-name"), "ERP Protheus");

    // Read comes checked by default; an ERP that only posts does not need it.
    await click(document.getElementById("api-key-scope-deliveries-read")!);
    await click(document.getElementById("api-key-scope-deliveries-write")!);
    await click(button(/emitir chave/i));

    expect(api.created).toHaveLength(1);
    expect(api.created[0]).toMatchObject({ scopes: ["deliveries:write"] });
  });

  it("fills the modal's width with Cancelar and the main action", async () => {
    await open();

    const footer = button(/emitir chave/i).closest("[data-dialog-footer]");

    expect(footer?.getAttribute("data-dialog-footer")).toBe("fill");
    expect(footer?.textContent).toMatch(/Cancelar/);
  });
});

describe("the issued key", () => {
  it("is shown in the copy field, and ESC asks before losing it", async () => {
    await open();

    await type(input("api-key-name"), "ERP Protheus");
    await click(button(/emitir chave/i));

    expect(document.querySelector("[data-copy-field]")?.textContent).toContain(
      "tjk_live_abc.segredo",
    );

    await act(async () => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    await settle();

    expect(closed, "ESC fechou a única tela que mostra a chave").toBe(0);
    expect(document.body.textContent).toMatch(/Fechar sem guardar\?/);

    await click(button(/voltar e copiar/i));

    expect(document.body.textContent).not.toMatch(/Fechar sem guardar\?/);
    expect(document.querySelector("[data-copy-field]")).not.toBeNull();

    // The explicit way out closes at once: pressing it is the answer.
    await click(button(/já copiei/i));

    expect(closed).toBe(1);
  });
});
