import * as React from "react";
import { act, createElement, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Live validation applied (decision 16.700), on the reference forms the other
 * dialogs copy: the user dialog and the checklist creation. Plus the forms
 * whose behaviour changed with it: the 2FA button, the login submit, the
 * quote steps.
 *
 * What is stood in for is what the browser cannot run here: Next's form
 * hooks (this runner's react-dom has none), the server actions, the record
 * pickers' lists and the vehicle request. The validation itself, the
 * schemas and the field components are the real ones.
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
}));

vi.mock("@/socket", () => ({ disconnectSocket: () => {} }));
vi.mock("@/lib/clear-session-state", () => ({ clearSessionState: () => {} }));

vi.mock("@/actions/user/create-user", () => ({
  handleCreateUser: vi.fn(async () => ({})),
}));
vi.mock("@/actions/user/update-user-registration", () => ({
  handleUpdateUserRegistration: vi.fn(async () => ({})),
}));
vi.mock("@/actions/user/create-master-user", () => ({
  handleCreateMasterUser: vi.fn(async () => ({})),
}));
vi.mock("@/actions/user/update-master-user", () => ({
  handleUpdateMasterUser: vi.fn(async () => ({})),
}));
vi.mock("@/actions/user/login-user", () => ({
  handleLoginUser: vi.fn(async () => ({})),
}));
vi.mock("@/actions/user/two-factor-authentication-user", () => ({
  handleTwoFactorAuthenticationUser: vi.fn(async () => ({})),
}));
vi.mock("@/actions/user/resend-two-factor-code", () => ({
  handleResendTwoFactorCode: vi.fn(async () => ({})),
}));
vi.mock("@/actions/quote/create-quote", () => ({
  handleQuoteSubmit: () => undefined,
}));
vi.mock("@/features/user/lib/after-write", () => ({
  refreshAfterUserWrite: vi.fn(),
}));

// The pickers render the message they are given, as the real ones do.
vi.mock("@/app/(protected)/_components/shared/searches/search-driver", () => ({
  SearchDriver: ({ errorDriverId }: { errorDriverId?: string[] }) =>
    createElement("div", { "data-picker": "driver" }, errorDriverId?.[0] ?? ""),
}));
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
        errorProfileAccessId?.[0] ?? "",
      ),
  }),
);

// The vehicle the checklist is for, as the form's query would load it.
vi.mock(
  "@/app/(protected)/_components/shared/searches/search-vehicle-by-id-business",
  () => ({
    useFetchVehicleData: () => ({
      data: {
        current_mileage: 50_000,
        maintenance_interval_km: 10_000,
        km_per_liter: 10,
        license_plate: "ABC1D23",
        description: "Caminhão",
      },
      isLoading: false,
    }),
  }),
);

// next/dynamic waits for a chunk; here each form's own photo field loads
// through its own loader (create and edit have different ones), and mount()
// waits for it.
vi.mock("next/dynamic", async () => {
  const ReactModule = await import("react");
  return {
    default: (
      loader: () => Promise<React.ComponentType<Record<string, unknown>>>,
    ) => {
      const Lazy = ReactModule.lazy(async () => ({ default: await loader() }));
      return (props: Record<string, unknown>) =>
        ReactModule.createElement(
          ReactModule.Suspense,
          { fallback: null },
          ReactModule.createElement(Lazy, props),
        );
    },
  };
});

import { UserFormDialog } from "@/features/user/form-dialog";
import { MasterUserFormDialog } from "@/features/user/master-form-dialog";
import { CreateVehicleChecklistFormSubmit } from "@/features/vehicle-checklist/create-form/submit";
import { UpdateChecklistFormSubmit } from "@/features/vehicle-checklist/update-form/submit";
import type { VehicleChecklistProps } from "@/features/vehicle-checklist/types";
import { TwoFactorAuthenticationForm } from "@/components/auth/two-factor-authentication-form";
import { LoginForm } from "@/components/auth/login-form";
import { QuoteForm } from "@/components/quote-form";
import { useAuthStore } from "@/store/auth-store";

import type { UserRow } from "@/features/user/types";

(globalThis as { React?: typeof React }).React = React;

const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

let root: Root | null = null;

async function mount(element: ReactElement): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => root!.render(element));
  // Lazy photo fields (next/dynamic above) resolve on the next ticks.
  await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));

  return document.body;
}

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const errorOf = (id: string) =>
  document.getElementById(`${id}-error`)?.textContent ?? null;

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
    // The visit is recorded once the focus has landed (a timer).
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
  // This runner's react-dom predates function `<form action>` (Next ships
  // its own canary): the one warning it prints for the auth forms is about
  // the test runtime, not the forms. Anything else still reaches the console.
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
  useAuthStore.setState({ role: "MASTER" });
});

afterEach(async () => {
  consoleSpy?.mockRestore();
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

const employee = {
  id: "018f0000-0000-7000-8000-0000000000a1",
  email: "consulta@trajetto.test",
  name: "Consulta E2E",
  role: "BUSINESS_USER",
  businessId: BUSINESS,
  profileAccessId: "018f0000-0000-7000-8000-0000000000p1",
  profileAccess: { name: "Consulta de entregas" },
  driverId: null,
} as unknown as UserRow;

describe("the user dialog (reference form)", () => {
  const create = () =>
    createElement(UserFormDialog, {
      businessId: BUSINESS,
      isOpen: true,
      onClose: () => {},
    });

  it("keeps Criar Usuário enabled on an empty form", async () => {
    await mount(create());

    const button = Array.from(document.querySelectorAll("button")).find(
      (element) => /Criar Usuário/.test(element.textContent ?? ""),
    )!;

    expect(button.disabled).toBe(false);
  });

  it("checks the e-mail when it is left and clears the message as soon as it is valid", async () => {
    await mount(create());
    const email = $<HTMLInputElement>("#user-email");

    expect(errorOf("user-email")).toBeNull();

    await leave(email, $("#user-name"));
    expect(errorOf("user-email")).toBe("O e-mail é obrigatório.");

    await type(email, "ana@trajetto");
    await type(email, "ana@trajetto.com.br");
    expect(errorOf("user-email")).toBeNull();
    expect(email.hasAttribute("aria-invalid")).toBe(false);
  });

  it("calls a name of spaces missing, in the action schema's words", async () => {
    // Red before: "O nome de usuário não deve conter espaços consecutivos."
    await mount(create());
    const name = $<HTMLInputElement>("#user-name");

    await type(name, "   ");
    await leave(name);

    expect(errorOf("user-name")).toBe("O nome é obrigatório.");
  });

  it("does not turn the e-mail red when the person presses Cancelar", async () => {
    await mount(create());

    const cancel = Array.from(document.querySelectorAll("button")).find(
      (element) => element.textContent === "Cancelar",
    )!;
    // A press with the pointer, as a click on it starts.
    cancel.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await leave($("#user-email"), cancel);

    expect(errorOf("user-email")).toBeNull();
  });

  it("on Criar shows every missing field, stops the submit and focuses the e-mail", async () => {
    await mount(create());

    const passed = await submit($<HTMLFormElement>("[data-user-form]"));

    expect(passed).toBe(false);
    expect(errorOf("user-email")).toBe("O e-mail é obrigatório.");
    expect(errorOf("user-name")).toBe("O nome é obrigatório.");
    expect($("#user-role").getAttribute("aria-invalid")).toBe("true");
    expect(errorOf("user-role")).toBe("Selecione o nível de acesso.");
    expect(document.activeElement).toBe($("#user-email"));
  });

  it("asks for the access profile once it is removed, before any request", async () => {
    await mount(
      createElement(UserFormDialog, {
        businessId: BUSINESS,
        user: employee,
        isOpen: true,
        onClose: () => {},
      }),
    );

    await act(async () => {
      $<HTMLButtonElement>('button[aria-label="Remover perfil"]').click();
    });

    const passed = await submit($<HTMLFormElement>("[data-user-form]"));

    expect(passed).toBe(false);
    expect($('[data-picker="profile"]').textContent).toBe(
      "Selecione um perfil de acesso.",
    );
  });

  it("checks the profile search when it is left, through its data-live-field wrapper", async () => {
    // Red before: the search's input id is generated, so leaving it marked
    // nothing and the profile was only checked on Criar.
    await mount(
      createElement(UserFormDialog, {
        businessId: BUSINESS,
        user: employee,
        isOpen: true,
        onClose: () => {},
      }),
    );

    await act(async () => {
      $<HTMLButtonElement>('button[aria-label="Remover perfil"]').click();
    });
    expect($('[data-picker="profile"]').textContent).toBe("");

    await leave($('[data-picker="profile"]'), $("#user-name"));

    expect($('[data-picker="profile"]').textContent).toBe(
      "Selecione um perfil de acesso.",
    );
  });

  it("checks the access level when the keyboard tabs from it to Cancelar", async () => {
    // Red before: any move to Cancelar was ignored, a Tab included.
    await mount(create());

    const cancel = Array.from(document.querySelectorAll("button")).find(
      (element) => element.textContent === "Cancelar",
    )!;
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
    );
    await leave($("#user-role"), cancel);

    expect(errorOf("user-role")).toBe("Selecione o nível de acesso.");
  });

  it("maps the action's field error to its field and clears it once that field is edited", async () => {
    formState.current = {
      createUserError: { email: ["Este e-mail já está em uso."] },
    };
    await mount(create());
    const email = $<HTMLInputElement>("#user-email");

    expect(errorOf("user-email")).toBe("Este e-mail já está em uso.");

    await type(email, "outra@trajetto.com.br");
    expect(errorOf("user-email")).toBeNull();
  });

  it("keeps Salvar disabled on edit until something changes", async () => {
    await mount(
      createElement(UserFormDialog, {
        businessId: BUSINESS,
        user: employee,
        isOpen: true,
        onClose: () => {},
      }),
    );

    const save = () =>
      Array.from(document.querySelectorAll("button")).find((element) =>
        /Salvar Alterações/.test(element.textContent ?? ""),
      )!;

    expect(save().disabled).toBe(true);

    await type($<HTMLInputElement>("#user-name"), "Consulta E2E Nova");
    expect(save().disabled).toBe(false);
  });
});

describe("the master user dialog", () => {
  it("validates live like the user dialog: enabled Criar, message on leave, all on submit with focus", async () => {
    // Red before: it had no client validation at all; Criar posted and only
    // the action's answer showed the errors.
    await mount(
      createElement(MasterUserFormDialog, { isOpen: true, onClose: () => {} }),
    );

    const create = Array.from(document.querySelectorAll("button")).find(
      (element) => /Criar Usuário Master/.test(element.textContent ?? ""),
    )!;
    expect(create.disabled).toBe(false);

    await type($<HTMLInputElement>("#master-name"), "   ");
    await leave($("#master-name"));
    expect(errorOf("master-name")).toBe("O nome é obrigatório.");

    const passed = await submit(create.closest("form")!);

    expect(passed).toBe(false);
    expect(errorOf("master-email")).toBe("O e-mail é obrigatório.");
    expect(document.activeElement).toBe($("#master-email"));
  });
});

describe("the checklist creation (reference form, data-dependent rule)", () => {
  const Wrapper = () => {
    const [files, setFiles] = useState<Record<string, File[]>>({});
    const [fileErrors, setFileErrors] = useState<Record<string, string | null>>(
      {},
    );

    return createElement(
      "form",
      { noValidate: true, "data-checklist-form": "" },
      createElement(CreateVehicleChecklistFormSubmit, {
        state: {},
        onBack: () => {},
        businessId: BUSINESS,
        commandBranchInputValue: {
          branchId: "b1",
          searchBranchInputValue: "Matriz",
        },
        commandVehicleInputValue: {
          vehicleId: "v1",
          searchVehicleInputValue: "Caminhão",
          vehicleLicensePlate: "ABC1D23",
        },
        checklistFiles: files,
        setChecklistFiles: setFiles,
        fileErrors,
        setFileErrors,
        initialFormValues: {},
        onFormValuesChange: () => {},
        uploadProgress: null,
        uploadError: null,
      }),
    );
  };

  it("keeps Criar checklist enabled while the checklist is incomplete", async () => {
    // Red before: disabled until every answer and photo was in, with no word why.
    await mount(createElement(Wrapper));

    const button = Array.from(document.querySelectorAll("button")).find(
      (element) => /Criar checklist/.test(element.textContent ?? ""),
    )!;

    expect(button.disabled).toBe(false);
  });

  it("says live that today's mileage must pass the vehicle's, from the data already loaded", async () => {
    await mount(createElement(Wrapper));
    const km = $<HTMLInputElement>("#current_mileage");

    await type(km, "40000");
    await leave(km);
    expect(errorOf("current_mileage")).toBe(
      "A quilometragem deve ser maior que a atual do veículo (50.000 km).",
    );

    await type(km, "50000");
    expect(errorOf("current_mileage")).toBe(
      "A quilometragem deve ser maior que a atual do veículo (50.000 km).",
    );

    await type(km, "50001");
    expect(errorOf("current_mileage")).toBeNull();
  });

  it("shows required photo areas neutral until they are invalid, then marks them", async () => {
    // Red before: a required area was red (and said "Obrigatório") on a
    // fresh form, and looked the same once actually in error.
    await mount(createElement(Wrapper));
    const area = () => $('[data-live-field="photo:current_mileage"]');

    expect(area().className).not.toMatch(/bg-red-50/);
    expect(area().textContent).not.toMatch(/Obrigatório/);

    await submit($<HTMLFormElement>("[data-checklist-form]"));

    expect(area().getAttribute("aria-invalid")).toBe("true");
    expect(area().className).toMatch(/bg-red-50/);
  });

  it("calls an emptied mileage missing, not zero", async () => {
    // Red before: an emptied field stored 0 and read "maior que zero".
    await mount(createElement(Wrapper));
    const km = $<HTMLInputElement>("#current_mileage");

    await type(km, "1");
    await type(km, "");
    await leave(km);

    expect(errorOf("current_mileage")).toBe(
      "A quilometragem atual do veículo é obrigatória.",
    );
  });

  it("on Criar shows the missing answers and photos, stops the submit and focuses the mileage", async () => {
    await mount(createElement(Wrapper));

    const passed = await submit($<HTMLFormElement>("[data-checklist-form]"));

    expect(passed).toBe(false);
    expect(errorOf("current_mileage")).toBe(
      "A quilometragem atual do veículo é obrigatória.",
    );
    expect(errorOf("tires_condition")).toBe(
      "A condição dos pneus é obrigatória.",
    );
    expect(errorOf("photo-current_mileage")).toBe(
      "Adicione ao menos uma foto.",
    );
    // An unanswered "Freios funcionando" has its own message; its photo does not repeat it.
    expect(errorOf("photo-brakes_working")).toBeNull();
    expect(document.activeElement).toBe($("#current_mileage"));
  });
});

describe("the checklist edit (dirty rule)", () => {
  const stored = {
    id: "018f0000-0000-7000-8000-0000000000c1",
    current_mileage: 48_000,
    checklist_date: "2026-10-01T13:00:00.000Z",
    tires_condition: "good",
    headlights_working: true,
    taillights_working: true,
    turn_signals_working: true,
    bumpers_condition: "good",
    windshield_condition: "good",
    mirrors_condition: "good",
    seatbelts_working: true,
    dashboard_working: true,
    steering_wheel_condition: "good",
    brakes_working: true,
    clutch_working: true,
    fuel_level_adequate: true,
    oil_level_adequate: true,
    radiator_water_adequate: true,
    brake_fluid_adequate: true,
    battery_condition: "good",
    driver_license_valid: true,
    vehicle_documents_valid: true,
    insurance_valid: true,
    fire_extinguisher_valid: true,
    warning_triangle_present: true,
    jack_present: true,
    spare_tire_condition: "good",
    notes: "",
    photos: [],
    overall_condition: "good",
    businessId: BUSINESS,
    branchId: "b1",
    vehicleId: "v1",
    driverId: "d1",
    branch: { corporate_reason: "Matriz", fantasy_name: null },
    vehicle: {
      description: "Caminhão",
      license_plate: "ABC1D23",
      brand: "VW",
      model: "Delivery",
      current_mileage: 50_000,
    },
    driver: { name: "Motorista", cnh: "123" },
    created_at: "2026-10-01T13:00:00.000Z",
    updated_at: "2026-10-01T13:00:00.000Z",
  } as unknown as VehicleChecklistProps;

  const Wrapper = () => {
    const [files, setFiles] = useState<Record<string, File[]>>({});
    const [fileErrors, setFileErrors] = useState<Record<string, string | null>>(
      {},
    );
    const [photosToRemove, setPhotosToRemove] = useState<string[]>([]);

    return createElement(
      "form",
      { noValidate: true, "data-checklist-edit": "" },
      createElement(UpdateChecklistFormSubmit, {
        state: {},
        onBack: () => {},
        checklistData: stored,
        isEntityDirty: false,
        initialFormValues: {},
        onFormValuesChange: () => {},
        commandBranchInputValue: {
          branchId: "b1",
          searchBranchInputValue: "Matriz",
        },
        commandVehicleInputValue: {
          vehicleId: "v1",
          searchVehicleInputValue: "Caminhão",
          vehicleLicensePlate: "ABC1D23",
        },
        commandDriverInputValue: {
          driverId: "d1",
          searchDriverInputValue: "Motorista",
        },
        checklistFiles: files,
        setChecklistFiles: setFiles,
        fileErrors,
        setFileErrors,
        photosToRemove,
        setPhotosToRemove,
        uploadProgress: null,
        uploadError: null,
      } as never),
    );
  };

  const save = () =>
    Array.from(document.querySelectorAll("button")).find((element) =>
      /Salvar alterações/.test(element.textContent ?? ""),
    )!;

  it("keeps Salvar disabled until something changes, enabled once it does, disabled again when undone", async () => {
    await mount(createElement(Wrapper));
    const km = $<HTMLInputElement>("#current_mileage");

    expect(save().disabled).toBe(true);

    await type(km, "48100");
    expect(save().disabled).toBe(false);

    await type(km, "48000");
    expect(save().disabled).toBe(true);
  });

  it("does not refuse a lower km against the vehicle on an edit: only the API knows the readings around the stored date", async () => {
    // A guard, not a red test: the edit never runs the vehicle rule now
    // (lib/mileage-rule), whatever the stored date.
    await mount(createElement(Wrapper));
    const km = $<HTMLInputElement>("#current_mileage");

    await type(km, "30000");
    await leave(km);

    expect(errorOf("current_mileage")).toBeNull();
    expect(save().disabled).toBe(false);
  });
});

describe("the auth forms", () => {
  it("2FA: keeps the button enabled and says under the field what a short code lacks", async () => {
    // Red before: the button stayed disabled until six digits were typed.
    await mount(
      createElement(TwoFactorAuthenticationForm, {
        email: "ana@trajetto.com.br",
      }),
    );

    const button = $<HTMLButtonElement>('[data-test="two-factor"]');
    expect(button.disabled).toBe(false);

    const passed = await submit(button.closest("form")!);

    expect(passed).toBe(false);
    expect(errorOf("two-factor-code")).toBe(
      "O código de verificação deve conter exatamente 6 dígitos numéricos.",
    );
    expect($('input[name="code"]').getAttribute("aria-invalid")).toBe("true");
  });

  it("login: calls an empty password missing, not short", async () => {
    // Red before: "A senha deve ter pelo menos 7 caracteres."
    await mount(createElement(LoginForm));

    await type($<HTMLInputElement>("#email"), "ana@trajetto.com.br");
    const passed = await submit($<HTMLFormElement>("form"));

    expect(passed).toBe(false);
    expect(errorOf("password")).toBe("A senha é obrigatória.");
    expect(document.activeElement).toBe($("#password"));
  });

  it("login: does not post an invalid e-mail and says why under the field", async () => {
    // Red before: nothing on the client stopped the submit.
    await mount(createElement(LoginForm));

    await type($<HTMLInputElement>("#email"), "nao-e-um-email");
    await type($<HTMLInputElement>("#password"), "segredo1");

    const passed = await submit($<HTMLFormElement>("form"));

    expect(passed).toBe(false);
    expect(errorOf("email")).toBe("O e-mail informado não é válido.");
    expect(errorOf("password")).toBeNull();
    expect(document.activeElement).toBe($("#email"));
  });
});

describe("the quote steps", () => {
  it("on Continuar with no fleet size moves focus into the radio group, not left on the button", async () => {
    // Red before: focus() on the invalid <fieldset> did nothing in a
    // browser; focus stayed on Continuar.
    await mount(createElement(QuoteForm));
    const form = $<HTMLFormElement>("form");
    const go = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    go.focus();

    expect(await submit(form)).toBe(false);

    expect(errorOf("fleet_size")).toBe("Selecione o tamanho da sua frota.");
    const active = document.activeElement as HTMLInputElement;
    expect(active.name).toBe("fleet_size");
    expect(active.value).toBe("1-5");
  });

  it("calls an empty name and phone missing at Contato", async () => {
    // Red before: "Por favor, insira o nome completo." and the 10-11 digit rule.
    await mount(createElement(QuoteForm));
    const form = $<HTMLFormElement>("form");

    await act(async () => {
      $<HTMLInputElement>('input[name="fleet_size"][value="6-15"]').click();
    });
    await submit(form);
    await submit(form);

    expect(errorOf("name")).toBe("O nome é obrigatório.");
    expect(errorOf("telephone")).toBe("O telefone é obrigatório.");
  });

  it("refuses a double space in the name at Contato, with the schema's message, before the server", async () => {
    // Red before: the step's light check took "Ana  Souza" and the refusal
    // only came back from the server after the last step.
    await mount(createElement(QuoteForm));
    const form = $<HTMLFormElement>("form");

    await act(async () => {
      $<HTMLInputElement>('input[name="fleet_size"][value="6-15"]').click();
    });
    expect(await submit(form)).toBe(false);

    await type($<HTMLInputElement>("#name"), "Ana  Souza");
    await type($<HTMLInputElement>("#company"), "Transportes Rápidos");
    await type($<HTMLInputElement>("#email"), "ana@transportes.com.br");
    await type($<HTMLInputElement>("#telephone"), "11912345678");
    await submit(form);

    expect(document.body.textContent).toMatch(/Etapa 2 de 3/);
    expect(errorOf("name")).toBe(
      "O nome não deve conter espaços consecutivos.",
    );
    expect(document.activeElement).toBe($("#name"));
  });
});
