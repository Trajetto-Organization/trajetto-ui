import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Live validation (decision 16.700) on the dialogs that are not a server
 * action `<form>` — they call `validate()` from their own button — and on
 * the profile's forms: message template, API key, webhook, tickets, the
 * spreadsheet import, "Mover para a posição", Cancelar rota, the profile
 * name and password and the WhatsApp number.
 *
 * Stood in for: the server actions, Next's form hooks and the record
 * combobox that fetches. Validation, schemas and fields are the real ones.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const calls = vi.hoisted(() => ({
  saved: 0,
  issued: 0,
  webhooks: 0,
  tickets: 0,
  imports: 0,
  cancelled: 0,
  whatsapp: [] as Array<Record<string, unknown>>,
  formState: null as unknown,
}));

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormState: (_action: unknown, initial: unknown) => [
    calls.formState ?? initial,
    () => {},
  ],
  useFormStatus: () => ({ pending: false }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/dashboard",
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));
vi.mock("@/actions/revalidate", () => ({
  revalidateTagName: async () => {},
  revalidateTags: async () => {},
}));
vi.mock("@/actions/delivery/message-templates", () => ({
  saveMessageTemplate: async () => {
    calls.saved += 1;
    return { success: true, message: "Mensagem salva." };
  },
}));
vi.mock("@/actions/integration", () => ({
  createApiKey: async () => {
    calls.issued += 1;
    return {
      success: true,
      message: "",
      data: { id: "k1", prefix: "tjk", token: "tjk.secret" },
    };
  },
  getIntegrationCatalogue: async () => ({
    success: true,
    message: "",
    data: {
      version: "v1",
      topics: [
        { topic: "route.released", family: "route", description: "Liberada." },
      ],
      scopes: [],
    },
  }),
  saveWebhookEndpoint: async () => {
    calls.webhooks += 1;
    return {
      success: true,
      message: "",
      data: { id: "w1", secret: "whsec_x" },
    };
  },
}));
vi.mock("@/actions/chat/tickets", () => ({
  openTicket: async () => {
    calls.tickets += 1;
    return { success: false, message: "x" };
  },
}));
vi.mock("@/actions/chat/tickets/list-ticket-contexts", () => ({
  listTicketContexts: async () => ({ success: true, data: [] }),
}));
vi.mock("@/actions/import/import-spreadsheet", () => ({
  importSpreadsheet: async () => {
    calls.imports += 1;
    return { success: false, message: "x" };
  },
}));
vi.mock("@/actions/import/download-template", () => ({
  downloadImportTemplate: async () => ({ success: false }),
}));
vi.mock("@/actions/route/route-operations", () => ({
  cancelRoute: async () => {
    calls.cancelled += 1;
    return { success: true, message: "Rota cancelada." };
  },
}));
vi.mock("@/actions/user/update-username", () => ({
  handleUpdateUserName: vi.fn(),
}));
vi.mock("@/actions/user/update-user-password", () => ({
  handleUpdateUserPassword: vi.fn(),
}));
vi.mock("@/actions/whatsapp/whatsapp-settings", () => ({
  updateWhatsAppSettings: async (request: Record<string, unknown>) => {
    calls.whatsapp.push(request);
    return { success: false, message: "x" };
  },
}));

// The record combobox fetches its list; it renders the message it is given
// on its control id, as the real one does.
vi.mock("@/features/account-payable/form-dialog/cursor-combobox", () => ({
  CursorCombobox: ({
    htmlFor,
    errorName,
  }: {
    htmlFor: string;
    errorName?: string[];
  }) =>
    createElement(
      "div",
      null,
      createElement("button", {
        type: "button",
        id: htmlFor,
        "aria-invalid": errorName?.length ? true : undefined,
      }),
      createElement("p", { id: `${htmlFor}-error` }, errorName?.[0] ?? ""),
    ),
}));

// The shipper picker fetches too; same stand-in.
vi.mock("@/features/deliveries/deliveries/shipper-selector", () => ({
  ShipperSelector: ({ errorName }: { errorName?: string[] }) =>
    createElement(
      "div",
      null,
      createElement("button", {
        type: "button",
        id: "shipper-selector",
        "aria-invalid": errorName?.length ? true : undefined,
      }),
      createElement(
        "p",
        { id: "shipper-selector-error" },
        errorName?.[0] ?? "",
      ),
    ),
}));

import { MessageTemplateDialog } from "@/features/deliveries/message-templates/form-dialog";
import { MESSAGE_SLOTS } from "@/features/deliveries/message-templates/lib/catalogue";
import { ApiKeyDialog } from "@/features/integrations/api-keys/create-dialog";
import { WebhookFormDialog } from "@/features/integrations/webhooks/form-dialog";
import { NewTicketDialog } from "@/features/deliveries/chat/tickets/new-ticket-dialog";
import { CloseTicketDialog } from "@/features/deliveries/chat/tickets/close-ticket-dialog";
import { ImportSpreadsheetDialog } from "@/features/deliveries/deliveries/import-spreadsheet-dialog";
import { MoveToPositionDialog } from "@/features/routes/detail-page/move-to-position-dialog";
import { CancelRouteDialog } from "@/features/routes/cancel-dialog";
import { UserNameForm } from "@/app/(protected)/_components/profile/account/user-name-form";
import { UserPasswordForm } from "@/app/(protected)/_components/profile/account/user-password-form";
import { WhatsAppSettings } from "@/app/(protected)/_components/profile/notifications/whatsapp/whatsapp-settings";
import { ChatComposer } from "@/features/deliveries/chat/composer";

import type { RouteListItem } from "@/actions/route/get-route";

(globalThis as { React?: typeof React }).React = React;

const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

let root: Root | null = null;

async function mount(element: ReactElement): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () =>
    root!.render(createElement(QueryClientProvider, { client }, element)),
  );
  await settle();
}

async function settle(times = 3): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await act(async () => new Promise((resolve) => setTimeout(resolve, 5)));
  }
}

const byId = <T extends HTMLElement = HTMLInputElement>(id: string) =>
  document.getElementById(id) as T;
const errorOf = (id: string) =>
  document.getElementById(`${id}-error`)?.textContent || null;

const buttonNamed = (label: RegExp) =>
  Array.from(document.querySelectorAll("button")).find((element) =>
    label.test((element.textContent ?? "").trim()),
  )!;

async function type(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(element),
    "value",
  )!.set!;

  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function leave(
  element: Element,
  next: Element | null = null,
): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new FocusEvent("focusout", { bubbles: true, relatedTarget: next }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.click());
  await settle();
}

/** A pointer press, as a click on a button starts. */
const press = (element: Element) =>
  element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

let consoleSpy: { mockRestore: () => void } | null = null;

beforeEach(() => {
  const consoleError = console.error.bind(console);
  consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation((...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("Invalid value for prop %s on <%s> tag")
      )
        return;
      if (
        typeof args[0] === "string" &&
        args[0].includes("Invalid value for prop `action`")
      )
        return;
      consoleError(...args);
    });

  calls.saved = 0;
  calls.issued = 0;
  calls.webhooks = 0;
  calls.tickets = 0;
  calls.imports = 0;
  calls.cancelled = 0;
  calls.whatsapp = [];
  calls.formState = null;
});

afterEach(async () => {
  consoleSpy?.mockRestore();
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("the message template dialog", () => {
  const whatsapp = MESSAGE_SLOTS.find((slot) => slot.channel === "WHATSAPP")!;

  const open = () =>
    mount(
      createElement(MessageTemplateDialog, {
        businessId: BUSINESS,
        slot: whatsapp,
        template: null,
        isOpen: true,
        onClose: () => {},
        onSaved: () => {},
      }),
    );

  it("checks the message once it is left, not only after Salvar", async () => {
    // Red before: the rules showed only once Salvar had been pressed.
    await open();
    const body = byId<HTMLTextAreaElement>("template-body");

    await type(body, "Oi {{nome}}");
    expect(errorOf("template-body")).toBeNull();

    await leave(body);
    expect(errorOf("template-body")).toMatch(
      /^A mensagem usa variáveis que não existem: \{\{nome\}\}/,
    );
  });

  it("does not paint the message when a variable chip is tapped mid-sentence", async () => {
    await open();
    const body = byId<HTMLTextAreaElement>("template-body");
    const chip =
      buttonNamed(/^\{\{nome_destinatario\}\}$/) ?? buttonNamed(/^\{\{/);

    await type(body, "Oi");
    press(chip);
    await leave(body, chip);

    expect(errorOf("template-body")).toBeNull();
  });

  it("on Salvar shows the problem, focuses the message and sends nothing", async () => {
    await open();

    await click(buttonNamed(/Salvar mensagem/));

    expect(calls.saved).toBe(0);
    expect(errorOf("template-body")).toBe(
      "O texto da mensagem deve ter no mínimo 10 caracteres.",
    );
    expect(document.activeElement).toBe(byId("template-body"));
  });
});

describe("the API key dialog", () => {
  const open = () =>
    mount(
      createElement(ApiKeyDialog, {
        businessId: BUSINESS,
        isOpen: true,
        mode: "dashboard",
        onClose: () => {},
        onCreated: () => {},
      }),
    );

  it("checks the name when it is left and clears the message as it is fixed", async () => {
    // Red before: messages appeared only after Emitir chave.
    await open();
    const name = byId("api-key-name");

    await type(name, "E");
    await leave(name);
    expect(errorOf("api-key-name")).toMatch(/^Dê um nome à chave/);

    await type(name, "ERP");
    expect(errorOf("api-key-name")).toBeNull();
  });

  it("asks for a scope once the last box is cleared, and focuses the group on Emitir", async () => {
    await open();

    await click(byId<HTMLButtonElement>("api-key-scope-deliveries-read"));
    expect(errorOf("api-key-scopes")).toBe("Escolha ao menos um escopo.");

    await type(byId("api-key-name"), "ERP Protheus");
    await click(buttonNamed(/Emitir chave/));

    expect(calls.issued).toBe(0);
    expect(byId("api-key-scopes").contains(document.activeElement)).toBe(true);
  });
});

describe("the webhook dialog", () => {
  it("checks the URL live and focuses the first invalid field on Criar", async () => {
    await mount(
      createElement(WebhookFormDialog, {
        businessId: BUSINESS,
        endpoint: null,
        isOpen: true,
        onClose: () => {},
        onSaved: () => {},
      }),
    );
    const url = byId("webhook-url");

    await type(url, "http://erp.exemplo.com.br/hook");
    expect(errorOf("webhook-url")).toBeNull();

    await leave(url);
    expect(errorOf("webhook-url")).toBe(
      "Só https. Em http os eventos trafegam abertos no caminho.",
    );

    await type(url, "https://erp.exemplo.com.br/hook");
    expect(errorOf("webhook-url")).toBeNull();

    await click(buttonNamed(/Criar endpoint/));

    expect(calls.webhooks).toBe(0);
    expect(errorOf("webhook-name")).toBe(
      "Dê um nome ao endpoint, com pelo menos dois caracteres.",
    );
    expect(errorOf("webhook-topics")).toBe(
      "Escolha ao menos um evento para enviar.",
    );
    expect(document.activeElement).toBe(byId("webhook-name"));
  });
});

describe("the new ticket dialog", () => {
  const open = () =>
    mount(
      createElement(NewTicketDialog, {
        driver: { id: "d1", name: "João" },
        onOpened: () => {},
        onClose: () => {},
      }),
    );

  it("leaving Assunto paints only Assunto", async () => {
    // Red before: one shared "touched" flag, so leaving the subject showed
    // the message of every field at once.
    await open();
    const subject = byId("new-ticket-subject");

    await type(subject, "Oi");
    await leave(subject);

    expect(errorOf("new-ticket-subject")).toBe(
      "O assunto deve ter ao menos 3 caracteres.",
    );
    expect(errorOf("new-ticket-message")).toBeNull();
  });

  it("asks for the delivery on Abrir atendimento and focuses it", async () => {
    await open();

    await click(byId<HTMLButtonElement>("new-ticket-about-DELIVERY"));
    await click(buttonNamed(/Abrir atendimento/));

    expect(calls.tickets).toBe(0);
    expect(errorOf("new-ticket-delivery")).toBe(
      "Escolha a entrega do atendimento.",
    );
    expect(document.activeElement).toBe(byId("new-ticket-delivery"));
  });
});

describe("the close ticket dialog", () => {
  it("does not flash the denial's reason when Cancelar is pressed", async () => {
    // Red before: any blur marked the note touched, a click on Cancelar
    // included, and the message flashed while the dialog closed.
    await mount(
      createElement(CloseTicketDialog, {
        ticket: { number: 12, subject: "Avaria" },
        outcome: "DENIED",
        blocksDelivery: false,
        isSaving: false,
        onConfirm: () => {},
        onClose: () => {},
      }),
    );
    const cancel = buttonNamed(/^Cancelar$/);

    press(cancel);
    await leave(byId("close-ticket-note"), cancel);

    expect(errorOf("close-ticket-note")).toBeNull();
  });
});

describe("the spreadsheet import", () => {
  it("keeps Importar enabled and says what is missing on press", async () => {
    // Red before: Importar stayed disabled until both were chosen, and
    // nothing said why.
    await mount(
      createElement(ImportSpreadsheetDialog, {
        businessId: BUSINESS,
        isOpen: true,
        onClose: () => {},
      }),
    );

    const importButton = buttonNamed(/^Importar$/);
    expect(importButton.disabled).toBe(false);

    await click(importButton);

    expect(calls.imports).toBe(0);
    expect(errorOf("shipper-selector")).toBe("Escolha o embarcador da carga.");
    expect(errorOf("import-spreadsheet-file")).toBe(
      "Escolha a planilha (.xlsx ou .csv).",
    );
    expect(byId("import-spreadsheet-file").getAttribute("aria-invalid")).toBe(
      "true",
    );
  });
});

describe("Mover para a posição", () => {
  it("is neutral while the number is typed, then says the range", async () => {
    // Red before: the field was red (aria-invalid) the moment it was
    // cleared, and Mover was disabled.
    await mount(
      createElement(MoveToPositionDialog, {
        open: true,
        title: "Parada 3",
        current: 3,
        total: 40,
        onOpenChange: () => {},
        onConfirm: () => {},
      }),
    );
    const position = byId("stop-position");

    await type(position, "");
    expect(position.hasAttribute("aria-invalid")).toBe(false);
    expect(buttonNamed(/^Mover$/).disabled).toBe(false);

    await leave(position);
    expect(errorOf("stop-position")).toBe("Informe um número de 1 a 40.");

    await type(position, "12");
    expect(errorOf("stop-position")).toBeNull();
  });
});

describe("Cancelar rota", () => {
  it("checks the reason once it is left, in the schema's words", async () => {
    // Red before: the reason was checked only on press.
    await mount(
      createElement(CancelRouteDialog, {
        businessId: BUSINESS,
        route: {
          id: "r1",
          code: 7,
          status: "PLANNED",
          stops: [],
        } as unknown as RouteListItem,
        isOpen: true,
        onClose: () => {},
      }),
    );
    const reason = byId<HTMLTextAreaElement>("cancel-route-reason");

    await type(reason, "ab");
    await leave(reason);

    expect(errorOf("cancel-route-reason")).toBe(
      "O motivo deve ter no mínimo 3 caracteres.",
    );

    // Red before: blank read "deve ter no mínimo 3 caracteres" (16.702).
    await type(reason, "   ");
    expect(errorOf("cancel-route-reason")).toBe(
      "Informe o motivo do cancelamento da rota.",
    );

    await click(buttonNamed(/^Cancelar Rota$/));
    expect(calls.cancelled).toBe(0);
  });
});

describe("the profile name", () => {
  it("says under the field that the full name is needed, once it is left", async () => {
    // Red before: no client check; the action's list went to a toast.
    await mount(
      createElement(UserNameForm, { userName: "Ana Souza", error: false }),
    );
    const name = byId("userName");

    await type(name, "Ana");
    expect(errorOf("userName")).toBeNull();

    await leave(name);
    expect(errorOf("userName")).toBe("Por favor, insira o nome completo.");
    expect(name.getAttribute("aria-invalid")).toBe("true");
  });

  it("calls an empty or blank name missing (16.702)", async () => {
    // Red before: "" read "Por favor, insira o nome completo." and "   "
    // "O nome não deve conter espaços consecutivos.".
    await mount(
      createElement(UserNameForm, { userName: "Ana Souza", error: false }),
    );
    const name = byId("userName");

    await type(name, "");
    await leave(name);
    expect(errorOf("userName")).toBe("O nome é obrigatório.");

    await type(name, "   ");
    expect(errorOf("userName")).toBe("O nome é obrigatório.");
  });

  it("shows the action's refusal under the field instead of a toast", async () => {
    calls.formState = {
      userNameError: ["O nome não deve exceder 100 caracteres."],
    };
    await mount(
      createElement(UserNameForm, { userName: "Ana Souza", error: false }),
    );

    expect(errorOf("userName")).toBe("O nome não deve exceder 100 caracteres.");
  });
});

describe("the profile password", () => {
  const open = async () => {
    await mount(createElement(UserPasswordForm, { error: false }));
    await click(buttonNamed(/Atualizar Senha/));
  };

  it("follows the confirmation live once it is left", async () => {
    // Red before: no client check; mismatches came back from the action.
    await open();

    const next = byId("new_password");
    const confirm = byId("confirm_new_password");

    await type(next, "segredo123");
    await type(confirm, "segredo12");
    await leave(confirm);
    expect(errorOf("confirm_new_password")).toBe("As senhas não coincidem.");

    await type(confirm, "segredo123");
    expect(errorOf("confirm_new_password")).toBeNull();
  });

  it("asks to confirm the new password when the confirmation is empty", async () => {
    // Red before: an empty confirmation next to a new password read
    // "As senhas não coincidem".
    await open();

    await type(byId("new_password"), "segredo123");
    await leave(byId("confirm_new_password"));

    expect(errorOf("confirm_new_password")).toBe("Confirme a nova senha.");
  });

  it("ties each refused field's message to its input through aria-describedby", async () => {
    // Red before: ids with spaces ("Senha atual") split aria-describedby into
    // two ids, neither of which existed.
    await open();

    const form = byId<HTMLInputElement>("current_password").closest("form")!;
    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    await settle();

    const messages: Record<string, string> = {
      current_password: "A senha atual é obrigatória.",
      new_password: "A nova senha é obrigatória.",
      confirm_new_password: "Confirme a nova senha.",
    };

    for (const [id, message] of Object.entries(messages)) {
      const input = byId(id);
      expect(input.getAttribute("aria-invalid")).toBe("true");

      const described = (input.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .map((target) => document.getElementById(target)?.textContent ?? null);

      expect(described).toContain(message);
    }

    expect(document.activeElement).toBe(byId("current_password"));
  });
});

describe("the WhatsApp number", () => {
  it("lets the switch be turned on and then says, under the field, why it did not", async () => {
    // Red before: the switch was disabled without a valid number.
    await mount(
      createElement(WhatsAppSettings, {
        userRole: "BUSINESS_ADMIN",
        driverId: null,
        initialSettings: {
          enabled: false,
          phoneNumber: null,
          serviceConfigured: true,
        },
      } as never),
    );

    const toggle = byId<HTMLButtonElement>("whatsapp-toggle");
    expect(toggle.disabled).toBe(false);

    await click(toggle);

    expect(calls.whatsapp).toHaveLength(0);
    expect(errorOf("phone")).toBe(
      "Informe o número com DDD para receber pelo WhatsApp.",
    );
    expect(document.activeElement).toBe(byId("phone"));
  });

  it("does not punish leaving the empty number while notifications are off", async () => {
    // Red before: focusing and leaving the empty, optional field painted
    // "Informe o número com DDD…".
    await mount(
      createElement(WhatsAppSettings, {
        userRole: "BUSINESS_ADMIN",
        driverId: null,
        initialSettings: {
          enabled: false,
          phoneNumber: null,
          serviceConfigured: true,
        },
      } as never),
    );

    const phone = byId("phone");
    await leave(phone);
    expect(errorOf("phone")).toBeNull();
    expect(phone.getAttribute("aria-invalid")).toBeNull();

    await type(phone, "1198");
    expect(errorOf("phone")).toBe(
      "Número incompleto: são 10 dígitos para fixo ou 11 para celular, com o DDD.",
    );
  });
});

describe("the chat composer's length notice", () => {
  const composer = () =>
    createElement(ChatComposer, {
      canWrite: true,
      onSend: () => {},
      onTyping: () => {},
      onCapturingChange: () => {},
      deliveryChip: null,
      onClearDeliveryChip: () => {},
    });

  it("announces only the limit sentence, not every count, and gives each composer its own id", async () => {
    // Red before: the whole count sat in an aria-live region (read out on
    // every keystroke from 1.800) under a fixed id shared by every composer.
    await mount(createElement("div", null, composer(), composer()));

    const [first, second] = Array.from(
      document.querySelectorAll<HTMLTextAreaElement>("textarea"),
    );
    await type(first, "a".repeat(1850));
    await type(second, "b".repeat(1900));

    const firstId = first.getAttribute("aria-describedby")!;
    const secondId = second.getAttribute("aria-describedby")!;
    expect(firstId).toBeTruthy();
    expect(firstId).not.toBe(secondId);
    expect(document.getElementById(firstId)?.textContent).toBe("1.850/2.000");

    const live = Array.from(document.querySelectorAll("[aria-live]"));
    expect(live.some((region) => /\d\/\d/.test(region.textContent ?? ""))).toBe(
      false,
    );

    await type(first, "a".repeat(2000));
    expect(live.length).toBeGreaterThan(0);
    expect(
      Array.from(document.querySelectorAll("[aria-live]")).some((region) =>
        (region.textContent ?? "").startsWith(
          "Limite de 2.000 caracteres atingido",
        ),
      ),
    ).toBe(true);
  });
});
