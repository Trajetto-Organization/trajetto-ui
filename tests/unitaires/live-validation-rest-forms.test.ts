import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubRelay } from "./helpers/relay-fetch";

/**
 * Live validation (decision 16.700) on the create/edit dialogs of the access
 * and catalogue screens and of Entregas: access profile, permission, shipper,
 * status reason, delivery, route and occurrence type.
 *
 * Stood in for: Next's form hooks (this runner's react-dom has none), the
 * server actions, and the record pickers that fetch their lists. The
 * schemas, the field components and the validation are the real ones.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const formState = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormState: (_action: unknown, initial: unknown) => [
    formState.current ?? initial,
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
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/actions/revalidate", () => ({
  revalidateTagName: async () => {},
  revalidateTags: async () => {},
}));
vi.mock("@/actions/profile-access/create-profile-access", () => ({
  handleCreateProfileAccess: vi.fn(),
}));
vi.mock("@/actions/profile-access/update-profile-access", () => ({
  handleUpdateProfileAccess: vi.fn(),
}));
vi.mock("@/features/profile-access/lib/after-write", () => ({
  refreshAfterProfileWrite: vi.fn(async () => {}),
}));
vi.mock("@/actions/permission/create-permission", () => ({
  handleCreatePermission: vi.fn(),
}));
vi.mock("@/actions/permission/update-permission", () => ({
  handleUpdatePermission: vi.fn(),
}));
vi.mock("@/features/permission/lib/after-write", () => ({
  refreshAfterPermissionWrite: vi.fn(async () => {}),
}));
vi.mock("@/actions/shipper/create-shipper", () => ({
  handleCreateShipper: vi.fn(),
}));
vi.mock("@/actions/shipper/update-shipper", () => ({
  handleUpdateShipper: vi.fn(),
}));
vi.mock("@/actions/status-change-reason/create-status-change-reason", () => ({
  handleCreateStatusChangeReason: vi.fn(),
}));
vi.mock("@/actions/status-change-reason/update-status-change-reason", () => ({
  handleUpdateStatusChangeReason: vi.fn(),
}));
vi.mock("@/actions/delivery/create-delivery", () => ({
  handleCreateDelivery: vi.fn(),
}));
vi.mock("@/actions/delivery/update-delivery", () => ({
  handleUpdateDelivery: vi.fn(),
}));
vi.mock("@/actions/occurrence-type/create-occurrence-type", () => ({
  handleCreateOccurrenceType: vi.fn(),
}));
vi.mock("@/actions/occurrence-type/update-occurrence-type", () => ({
  handleUpdateOccurrenceType: vi.fn(),
}));
vi.mock("@/actions/branch/create-branch", () => ({
  handleCreateBranch: vi.fn(),
}));
vi.mock("@/actions/branch/update-branch", () => ({
  handleUpdateBranch: vi.fn(),
}));
vi.mock("@/features/branch/lib/after-write", () => ({
  refreshAfterBranchWrite: vi.fn(async () => {}),
}));
vi.mock("@/actions/business/update-ai-limit", () => ({
  handleUpdateAILimit: vi.fn(),
}));
vi.mock("@/actions/business/update-vehicle-limit", () => ({
  handleUpdateVehicleLimit: vi.fn(),
}));
vi.mock("@/actions/route/create-route", () => ({ handleCreateRoute: vi.fn() }));
vi.mock("@/actions/route/update-route", () => ({ handleUpdateRoute: vi.fn() }));
vi.mock("@/actions/route/assignment-preview", () => ({
  getAssignmentPreview: async () => ({
    success: true,
    message: "",
    data: null,
  }),
}));

// The pickers render the message they are given, as the real ones do, on
// the control id the real ones use.
vi.mock(
  "@/app/(protected)/_components/shared/searches/search-profile-access",
  () => ({
    SearchProfileAccess: ({
      errorProfileAccessId,
    }: {
      errorProfileAccessId?: string[];
    }) =>
      createElement(
        "div",
        { "data-picker": "profile" },
        createElement("input", { "data-picker-input": "profile" }),
        errorProfileAccessId?.[0] ?? "",
      ),
  }),
);
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
vi.mock(
  "@/app/(protected)/_components/shared/selectors/driver-selector",
  () => ({
    DriverSelector: ({ errorName }: { errorName?: string[] }) =>
      createElement(
        "div",
        null,
        createElement("button", {
          type: "button",
          id: "driver-selector",
          "aria-invalid": errorName?.length ? true : undefined,
        }),
        createElement(
          "p",
          { id: "driver-selector-error" },
          errorName?.[0] ?? "",
        ),
      ),
  }),
);
vi.mock(
  "@/app/(protected)/_components/shared/selectors/vehicle-selector",
  () => ({
    VehicleSelector: () =>
      createElement("button", { type: "button", id: "vehicle-selector" }),
  }),
);

import { ProfileAccessFormDialog } from "@/features/profile-access/form-dialog";
import { PermissionFormDialog } from "@/features/permission/form-dialog";
import { ShipperFormDialog } from "@/features/deliveries/shippers/form-dialog";
import { StatusChangeReasonFormDialog } from "@/features/deliveries/status-change-reasons/form-dialog";
import { DeliveryFormDialog } from "@/features/deliveries/deliveries/form-dialog";
import { RouteFormDialog } from "@/features/routes/form-dialog";
import { OccurrenceTypeFormDialog } from "@/features/deliveries/occurrence-types/form-dialog";
import { BranchFormDialog } from "@/features/branch/form-dialog";
import { UpdateAILimitForm } from "@/app/(protected)/_components/admin/business/update-ai-limit-form";
import { UpdateVehicleLimitForm } from "@/features/business-vehicle-limit/update-form";
import { useAuthStore } from "@/store/auth-store";
import { useAIVerificationStore } from "@/store/ai-verification-store";

import type { ProfileAccessRow } from "@/features/profile-access/types";

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
  await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
}

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
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

/** Submits like the browser does; false when something prevented it. */
async function submit(form: HTMLFormElement): Promise<boolean> {
  let passed = true;

  await act(async () => {
    passed = form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

  return passed;
}

let consoleSpy: { mockRestore: () => void } | null = null;

beforeEach(() => {
  // This runner's react-dom predates function `<form action>`; that one
  // warning is about the runtime, not the forms.
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

  formState.current = null;
  useAuthStore.setState({
    role: "BUSINESS_ADMIN",
    enabledModules: ["FLEET", "DELIVERIES"],
  } as never);

  // The limit dialogs read the company's usage and plan through the relay.
  stubRelay([
    [
      /^\/business\/get-ai-usage\/[^/]+$/,
      () => ({
        data: {
          ai_analysis_limit: 100,
          ai_analysis_used: 10,
          ai_analysis_in_progress: 0,
          ai_analysis_reset_at: null,
          ai_analysis_timezone: "America/Sao_Paulo",
        },
      }),
    ],
    [
      /^\/business\/entitlements\/[^/]+$/,
      () => ({
        data: {
          vehicle_limit: 45,
          vehicle_count: 30,
          vehicle_inactive_count: 2,
        },
      }),
    ],
  ]);
});

afterEach(async () => {
  consoleSpy?.mockRestore();
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("the access profile dialog", () => {
  const create = () =>
    createElement(ProfileAccessFormDialog, {
      businessId: BUSINESS,
      isOpen: true,
      onClose: () => {},
    });

  it("says nothing while typing, checks the name on leave and clears it on the fixing keystroke", async () => {
    // Red before: no client check at all; the message only came back from
    // the action after Criar.
    await mount(create());
    const name = $<HTMLInputElement>("#profile-name");

    await type(name, "Su");
    expect(errorOf("profile-name")).toBeNull();

    await leave(name);
    expect(errorOf("profile-name")).toBe(
      "O nome do perfil deve ter no mínimo 3 caracteres.",
    );

    await type(name, "Sup");
    expect(errorOf("profile-name")).toBeNull();
  });

  it("on Criar Perfil stops the submit and focuses the name", async () => {
    await mount(create());

    expect(buttonNamed(/Criar Perfil/).disabled).toBe(false);

    const passed = await submit(
      $<HTMLFormElement>("[data-profile-access-form]"),
    );

    expect(passed).toBe(false);
    // Red before: an empty name read "deve ter no mínimo 3 caracteres" (16.702).
    expect(errorOf("profile-name")).toBe("O nome do perfil é obrigatório.");
    expect(document.activeElement).toBe($("#profile-name"));
  });

  it("calls a name of spaces missing, not short or badly spaced", async () => {
    // Red before: "  " read "deve ter no mínimo 3 caracteres" and "   "
    // "não pode ser vazio ou conter apenas espaços".
    await mount(create());
    const name = $<HTMLInputElement>("#profile-name");

    await type(name, "  ");
    await leave(name);
    expect(errorOf("profile-name")).toBe("O nome do perfil é obrigatório.");

    await type(name, "   ");
    expect(errorOf("profile-name")).toBe("O nome do perfil é obrigatório.");
  });

  it("keeps Salvar disabled on edit until the name changes", async () => {
    const profile = {
      id: "p1",
      name: "Supervisor",
      businessId: BUSINESS,
    } as unknown as ProfileAccessRow;
    await mount(
      createElement(ProfileAccessFormDialog, {
        businessId: BUSINESS,
        profile,
        isOpen: true,
        onClose: () => {},
      }),
    );

    expect(buttonNamed(/Salvar Alterações/).disabled).toBe(true);

    await type($<HTMLInputElement>("#profile-name"), "Supervisor Norte");
    expect(buttonNamed(/Salvar Alterações/).disabled).toBe(false);
  });

  it("does not paint the name when Cancelar is pressed", async () => {
    await mount(create());

    const cancel = buttonNamed(/^Cancelar$/);
    cancel.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await leave($("#profile-name"), cancel);

    expect(errorOf("profile-name")).toBeNull();
  });
});

describe("the permission dialog", () => {
  const create = () =>
    createElement(PermissionFormDialog, {
      businessId: BUSINESS,
      isOpen: true,
      onClose: () => {},
    });

  it("asks for Leitura as soon as the box is left unchecked, without waiting for the other fields", async () => {
    // Red before: the read rule was only checked on Criar, and the schema's
    // object refine would have waited for every other field.
    await mount(create());

    const read = $<HTMLButtonElement>("#permission-read");
    await act(async () => read.click());
    await leave(read, $("#permission-action"));

    expect(errorOf("permission-read")).toBe(
      "Selecione a opção Leitura (caso deseje, marque também Escrita).",
    );
  });

  it("moving from Leitura to Escrita is not leaving the access field", async () => {
    await mount(create());

    const read = $<HTMLButtonElement>("#permission-read");
    await act(async () => read.click());
    await leave(read, $("#permission-write"));

    expect(errorOf("permission-read")).toBeNull();
  });

  it("checks the profile search when it is left, through its wrapper", async () => {
    await mount(create());

    await leave($('[data-picker-input="profile"]'), $("#permission-action"));

    expect($('[data-picker="profile"]').textContent).toBe(
      "Selecione o perfil de acesso.",
    );
  });

  it("on Criar Permissão shows every missing field and focuses the name", async () => {
    await mount(create());

    const passed = await submit($<HTMLFormElement>("[data-permission-form]"));

    expect(passed).toBe(false);
    expect(errorOf("permission-action")).toBe(
      "O nome da permissão é obrigatório.",
    );
    expect(errorOf("permission-key")).toBe("Selecione a permissão.");
    expect($('[data-picker="profile"]').textContent).toBe(
      "Selecione o perfil de acesso.",
    );
    expect(document.activeElement).toBe($("#permission-action"));
  });
});

describe("the shipper dialog", () => {
  const create = () =>
    createElement(ShipperFormDialog, {
      businessId: BUSINESS,
      shipper: null,
      isOpen: true,
      onClose: () => {},
    });

  it("refuses a CNPJ with wrong check digits once it is left", async () => {
    // Red before: the CNPJ was only checked by the action, after Criar.
    await mount(create());
    const cnpj = $<HTMLInputElement>("#cnpj");

    await type(cnpj, "11.111.111/1111-11");
    await leave(cnpj);

    expect(errorOf("cnpj")).toBe("O CNPJ informado não é válido.");
  });

  it("keeps Criar Embarcador enabled and stops an empty submit on the name", async () => {
    await mount(create());

    expect(buttonNamed(/Criar Embarcador/).disabled).toBe(false);

    const passed = await submit($<HTMLFormElement>("[data-shipper-form]"));

    expect(passed).toBe(false);
    expect(errorOf("name")).not.toBeNull();
    expect(document.activeElement).toBe($("#name"));
  });
});

describe("the status reason dialog", () => {
  it("calls a name of spaces out on leave, in the action schema's words", async () => {
    await mount(
      createElement(StatusChangeReasonFormDialog, {
        businessId: BUSINESS,
        reason: null,
        isOpen: true,
        onClose: () => {},
      }),
    );
    const name = $<HTMLInputElement>("#name");

    await type(name, "   ");
    expect(errorOf("name")).toBeNull();

    await leave(name);
    expect(errorOf("name")).not.toBeNull();

    await type(name, "Cliente cancelou");
    expect(errorOf("name")).toBeNull();
  });
});

describe("the delivery dialog", () => {
  const create = () =>
    createElement(DeliveryFormDialog, {
      businessId: BUSINESS,
      isOpen: true,
      onClose: () => {},
    });

  it("keeps Criar Entrega enabled and focuses the shipper on an empty submit", async () => {
    await mount(create());

    expect(buttonNamed(/Criar Entrega/).disabled).toBe(false);

    const passed = await submit($<HTMLFormElement>("[data-delivery-form]"));

    expect(passed).toBe(false);
    expect(errorOf("shipper-selector")).toBe("O embarcador é obrigatório.");
    expect(errorOf("recipient_name")).not.toBeNull();
    expect(errorOf("cep")).toBe("O CEP é obrigatório.");
    expect(errorOf("recipient_name")).toBe(
      "O nome do destinatário é obrigatório.",
    );
    expect(document.activeElement).toBe($("#shipper-selector"));
  });

  it("names a bad item under its row once the cell is left", async () => {
    // Red before: an item was only checked by the action, and came back as
    // "Item 1: …" in a list above the rows after a round trip.
    await mount(create());

    await act(async () => buttonNamed(/Adicionar item/).click());

    const description = document.querySelector<HTMLInputElement>(
      '[id$="-description"]',
    )!;
    const key = description.id.split("-")[1];

    expect(document.getElementById(`item-${key}-errors`)).toBeNull();

    await leave(description);

    expect(description.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(`item-${key}-errors`)?.textContent).toBe(
      "A descrição do item é obrigatória.",
    );

    await type(description, "Caixa");
    expect(document.getElementById(`item-${key}-errors`)).toBeNull();
  });

  it("asks for the quantity in Portuguese when a filled row's Qtd. is cleared", async () => {
    // Red before: the empty cell became undefined and zod answered "Required".
    await mount(create());

    await act(async () => buttonNamed(/Adicionar item/).click());

    const description = document.querySelector<HTMLInputElement>(
      '[id$="-description"]',
    )!;
    const key = description.id.split("-")[1];
    const quantity = $<HTMLInputElement>(`#item-${key}-quantity`);

    await type(description, "Caixa");
    await type(quantity, "");
    await leave(quantity);

    expect(quantity.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(`item-${key}-errors`)?.textContent).toBe(
      "A quantidade é obrigatória.",
    );
    // An emptied cell must not look filled: the placeholder is not a bare "1".
    expect(quantity.placeholder).toBe("Ex.: 1");
  });

  it("keeps Qtd., Valor and the trash button on one row on phones", async () => {
    // Red before: a two-column grid pushed the trash button onto a line of
    // its own under Qtd. at 390px.
    await mount(create());

    await act(async () => buttonNamed(/Adicionar item/).click());

    const description = document.querySelector<HTMLInputElement>(
      '[id$="-description"]',
    )!;
    const row = description.closest("[data-item-row]")!;

    expect(row.className).toContain("grid-cols-[5rem_minmax(0,1fr)_auto]");
    expect(description.parentElement!.className).toContain("col-span-3");
    expect(
      row.querySelector(
        `label[for="${description.id.replace("description", "value")}"]`,
      )?.textContent,
    ).toBe("Valor un. em R$ (opcional)");
  });

  it("labels the address number optional, as the delivery schema takes it", async () => {
    // Red before: "Número *" over a field the schema accepts empty.
    await mount(create());

    expect(
      document.querySelector('label[for="address_number"]')?.textContent,
    ).toBe("Número (opcional)");
  });

  it("checks the recipient's e-mail live", async () => {
    await mount(create());
    const email = $<HTMLInputElement>("#recipient_email");

    await type(email, "maria@");
    await leave(email);
    expect(errorOf("recipient_email")).toBe(
      "O e-mail do destinatário não é válido.",
    );

    await type(email, "maria@loja.com.br");
    expect(errorOf("recipient_email")).toBeNull();
  });
});

describe("the route dialog", () => {
  const create = () =>
    createElement(RouteFormDialog, {
      businessId: BUSINESS,
      isOpen: true,
      onClose: () => {},
    });

  it("keeps Criar rota enabled without a driver and says it is missing on press", async () => {
    // Red before: the button stayed disabled until a driver was chosen, and
    // nothing said why.
    await mount(create());

    expect(buttonNamed(/^Criar rota$/).disabled).toBe(false);

    const passed = await submit($<HTMLFormElement>("[data-route-form]"));

    expect(passed).toBe(false);
    expect(errorOf("driver-selector")).toBe("O motorista é obrigatório.");
    expect(document.activeElement).toBe($("#driver-selector"));
  });

  it("checks the name's spacing when it is left", async () => {
    await mount(create());
    const name = $<HTMLInputElement>("#name");

    await type(name, "Zona  Sul");
    await leave(name);

    expect(errorOf("name")).toBe(
      "O nome da rota não deve conter espaços consecutivos.",
    );
  });
});

describe("the occurrence type dialog", () => {
  const create = () =>
    createElement(OccurrenceTypeFormDialog, {
      businessId: BUSINESS,
      occurrenceType: null,
      isOpen: true,
      onClose: () => {},
    });

  it("keeps a new question neutral until the builder is left or Criar is pressed", async () => {
    // Red before: an empty question was painted red the moment it was added,
    // and Criar Tipo was disabled while the form was incomplete.
    await mount(create());

    await act(async () => buttonNamed(/Adicionar pergunta/).click());

    const builder = $('[data-live-field="form_fields"]');
    expect(builder.querySelector('[aria-invalid="true"]')).toBeNull();
    expect(buttonNamed(/Criar Tipo/).disabled).toBe(false);

    await type($<HTMLInputElement>("#name"), "Destinatário ausente");
    const passed = await submit(
      $<HTMLFormElement>("[data-occurrence-type-form]"),
    );

    expect(passed).toBe(false);
    expect(builder.querySelector('[aria-invalid="true"]')).not.toBeNull();
    expect(builder.contains(document.activeElement)).toBe(true);
  });

  it("asks for the pause's nature on Criar instead of a disabled button", async () => {
    await mount(create());

    await act(async () => $<HTMLButtonElement>("#category-PAUSE").click());
    await type($<HTMLInputElement>("#name"), "Almoço");

    expect(buttonNamed(/Criar Tipo/).disabled).toBe(false);
    expect(errorOf("pause_kind_group")).toBeNull();

    const passed = await submit(
      $<HTMLFormElement>("[data-occurrence-type-form]"),
    );

    expect(passed).toBe(false);
    expect(errorOf("pause_kind_group")).toBe(
      "Escolha a natureza legal da pausa (refeição, descanso ou outra).",
    );
  });
});

describe("the branch dialog", () => {
  const create = () =>
    createElement(BranchFormDialog, {
      businessId: BUSINESS,
      isOpen: true,
      onClose: () => {},
    });

  it("checks a short CNPJ when it is left and focuses the first field on Criar", async () => {
    // Red before: no client check; every message came back from the action.
    await mount(create());
    const cnpj = $<HTMLInputElement>("#cnpj");

    await type(cnpj, "12.345");
    await leave(cnpj);
    expect(errorOf("cnpj")).toBe("O CNPJ deve ter exatamente 14 dígitos.");

    const passed = await submit($<HTMLFormElement>("[data-branch-form]"));

    expect(passed).toBe(false);
    expect(errorOf("corporate_reason")).toBe("A razão social é obrigatória.");
    expect(document.activeElement).toBe($("#corporate_reason"));
  });

  it("says what is missing for empty address, document and contact fields", async () => {
    // Red before: "deve ter exatamente 8/14 dígitos", "Por favor, insira o
    // nome completo" and "deve conter 10 ou 11 dígitos" for empty fields.
    await mount(create());

    await submit($<HTMLFormElement>("[data-branch-form]"));

    expect(errorOf("cnpj")).toBe("O CNPJ é obrigatório.");
    expect(errorOf("cep")).toBe("O CEP é obrigatório.");
    expect(errorOf("responsible_name")).toBe(
      "O nome do responsável é obrigatório.",
    );
    expect(errorOf("telephone")).toBe("O telefone é obrigatório.");
  });
});

describe("the AI limit dialog", () => {
  it("asks for the limit when it is cleared, instead of saving 0 silently", async () => {
    // Red before: an empty field was coerced to 0 (analysis off) by the
    // action's schema without a word.
    await mount(
      createElement(UpdateAILimitForm, {
        businessId: BUSINESS,
        businessName: "Transportadora",
        isAILimitOpen: true,
        handleCloseAILimit: () => {},
      }),
    );
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));

    const limit = $<HTMLInputElement>("#ai_analysis_limit");
    expect(limit.value).toBe("100");

    await type(limit, "");
    await leave(limit);

    expect(errorOf("ai_analysis_limit")).toBe(
      "Informe o limite mensal (0 desabilita a análise).",
    );

    await type(limit, "20000");
    expect(errorOf("ai_analysis_limit")).toBe(
      "O limite não pode exceder 10.000 análises por mês.",
    );
  });
});

describe("the AI limit dialog under live usage", () => {
  it("keeps what is typed when a socket event updates the usage", async () => {
    // Red before: the reset effect was keyed on the usage object, so any
    // analysis finishing while the MASTER typed put the stored limit back.
    useAIVerificationStore.setState({ businessUsage: new Map() } as never);

    await mount(
      createElement(UpdateAILimitForm, {
        businessId: BUSINESS,
        businessName: "Transportadora",
        isAILimitOpen: true,
        handleCloseAILimit: () => {},
      }),
    );
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));

    const limit = $<HTMLInputElement>("#ai_analysis_limit");
    await type(limit, "150");

    await act(async () => {
      useAIVerificationStore
        .getState()
        .updateBusinessUsage(BUSINESS, { used: 12, limit: 100 } as never);
    });
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));

    expect(limit.value).toBe("150");
    expect(buttonNamed(/Salvar Limite/).disabled).toBe(false);
  });
});

describe("the vehicle limit dialog", () => {
  it("asks for the limit when it is cleared and stops Salvar from saving 0", async () => {
    // Red before: an uncontrolled field with no client check; clearing it
    // enabled Salvar and the action coerced "" to 0, lifting the cap.
    await mount(
      createElement(UpdateVehicleLimitForm, {
        businessId: BUSINESS,
        businessName: "Transportadora",
        isOpen: true,
        handleClose: () => {},
      }),
    );
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));

    const limit = $<HTMLInputElement>("#vehicle_limit");
    expect(limit.value).toBe("45");

    await type(limit, "");
    expect(errorOf("vehicle_limit")).toBeNull();

    await leave(limit);
    expect(errorOf("vehicle_limit")).toBe(
      "Informe o limite de veículos (0 = sem limite).",
    );

    const passed = await submit(limit.closest("form")!);

    expect(passed).toBe(false);
    expect(document.activeElement).toBe(limit);

    await type(limit, "200000");
    expect(errorOf("vehicle_limit")).toBe(
      "O limite não pode exceder 100.000 veículos.",
    );

    await type(limit, "50");
    expect(errorOf("vehicle_limit")).toBeNull();
  });
});
