import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Live validation on the fleet forms (decision 16.700), driven through the
 * real dialogs: the schemas, the field components and the live primitive are
 * the real ones.
 *
 * What is stood in for is what the browser cannot run here: Next's form
 * hooks (this runner's react-dom has none), the server actions, the record
 * pickers of the wizard steps (each one a "Continuar" button), the vehicle
 * request, and the map.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

// What the server action "answered": one stable object, as useFormState keeps it.
const actionState = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormState: (_action: unknown, initial: unknown) => [
    actionState.current ?? initial,
    () => {},
  ],
  useFormStatus: () => ({ pending: false }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/dashboard",
}));

// Every server action of these dialogs: nothing here reaches a server.
vi.mock("@/actions/vehicle/create-vehicle", () => ({
  handleCreateVehicle: vi.fn(),
}));
vi.mock("@/actions/vehicle/update-vehicle", () => ({
  handleUpdateVehicle: vi.fn(),
}));
vi.mock("@/actions/fuel/create-fuel", () => ({ handleCreateFuel: vi.fn() }));
vi.mock("@/actions/fuel-type/create-fuel-type", () => ({
  handleCreateFuelType: vi.fn(),
}));
vi.mock("@/actions/fuel-type/update-fuel-type", () => ({
  handleUpdateFuelType: vi.fn(),
}));
vi.mock("@/actions/account-payable/create-account-payable", () => ({
  handleCreateAccountPayable: vi.fn(),
}));
vi.mock("@/actions/account-payable/update-account-payable", () => ({
  handleUpdateAccountPayable: vi.fn(),
}));
vi.mock("@/actions/fine/create-fine", () => ({ handleCreateFine: vi.fn() }));
vi.mock("@/actions/fine/update-fine", () => ({ handleUpdateFine: vi.fn() }));
vi.mock("@/actions/vehicle-type/create-vehicle-type", () => ({
  handleCreateVehicleType: vi.fn(),
}));
vi.mock("@/actions/vehicle-type/update-vehicle-type", () => ({
  handleUpdateVehicleType: vi.fn(),
}));
vi.mock("@/actions/supplier/create-supplier", () => ({
  handleCreateSupplier: vi.fn(),
}));
vi.mock("@/actions/supplier/update-supplier", () => ({
  handleUpdateSupplier: vi.fn(),
}));
vi.mock("@/actions/driver/create-driver", () => ({
  handleCreateDriver: vi.fn(),
}));
vi.mock("@/actions/driver/update-driver", () => ({
  handleUpdateDriver: vi.fn(),
}));
vi.mock("@/features/supplier/lib/after-write", () => ({
  refreshAfterSupplierWrite: vi.fn(),
}));
vi.mock("@/features/driver/lib/after-write", () => ({
  refreshAfterDriverWrite: vi.fn(),
}));
// The driver's optional branch search hits the server; it has its own tests.
vi.mock("@/app/(protected)/_components/shared/searches/search-branch", () => ({
  SearchBranch: () => null,
}));
vi.mock("@/actions/revalidate", () => ({ revalidateTags: vi.fn() }));
vi.mock("@/actions/kanban/create-kanban-card", () => ({
  handleCreateKanbanCard: vi.fn(),
}));
vi.mock("@/actions/kanban/update-kanban-card", () => ({
  handleUpdateKanbanCard: vi.fn(),
}));
vi.mock("@/actions/kanban/delete-kanban-card", () => ({
  handleDeleteKanbanCard: vi.fn(),
}));
vi.mock("@/features/fuel-type/lib/after-write", () => ({
  refreshAfterFuelTypeWrite: vi.fn(),
}));
vi.mock("@/features/fuel/form/after-write", () => ({
  refreshAfterFuelWrite: vi.fn(),
}));
vi.mock("@/features/account-payable/lib/after-write", () => ({
  refreshAfterAccountPayableWrite: vi.fn(),
}));

// The profile may do everything these forms offer.
vi.mock("@/lib/user-has-permission", () => ({ useHasPermission: () => true }));
vi.mock("@/features/fuel/hooks/use-fuel-permissions", () => ({
  useFuelWritePermissions: () => ({
    hasAllPermissions: true,
    tooltipMessage: "",
  }),
}));
vi.mock("@/app/(protected)/_components/kanban/hooks/query-client", () => ({
  useKanbanQueryClient: () => ({ invalidateKanbanQueries: vi.fn() }),
}));
vi.mock("@/app/(protected)/_components/kanban/user-selector", () => ({
  UserSelector: () => null,
}));

// A wizard step is a "Continuar" button here: the pickers have their own tests.
const { step } = vi.hoisted(() => ({
  step:
    () =>
    ({ onContinue }: { onContinue: () => void }) =>
      // Required lazily: vi.hoisted runs before the imports.
      (require("react") as typeof import("react")).createElement(
        "button",
        { type: "button", "data-continue": "", onClick: onContinue },
        "Continuar",
      ),
}));

vi.mock(
  "@/app/(protected)/_components/shared/steps/select-branch-step",
  () => ({
    SelectBranchStep: step(),
  }),
);
vi.mock(
  "@/app/(protected)/_components/shared/steps/select-driver-vehicle-type-step",
  () => ({
    SelectDriverVehicleTypeStep: step(),
  }),
);
vi.mock(
  "@/app/(protected)/_components/shared/steps/select-fuel-type-step",
  () => ({
    SelectFuelTypeStep: step(),
  }),
);
vi.mock(
  "@/app/(protected)/_components/shared/steps/select-vehicle-driver-step",
  () => ({
    SelectVehicleDriverStep: step(),
  }),
);
vi.mock(
  "@/app/(protected)/_components/shared/steps/select-violation-code-step",
  () => ({
    SelectViolationCodeStep: step(),
  }),
);

// The bill's pickers search on the server; each renders the message it gets.
vi.mock("@/features/account-payable/form-dialog/pickers", () => {
  const picker =
    (name: string) =>
    ({ errorName }: { errorName?: string[] }) =>
      createElement("div", { "data-picker": name }, errorName?.[0] ?? "");

  return {
    BranchPicker: picker("branch"),
    ResponsiblePicker: picker("responsible"),
    ServiceOrderPicker: picker("service-order"),
    VehiclePicker: picker("vehicle"),
    SupplierPicker: picker("supplier"),
  };
});

// The vehicle the refueling and the order are for, as the form's query loads it.
// One object, as react-query keeps it: a new one per render would re-run
// the order form's snapshot effect forever.
const vehicleData = vi.hoisted(() => ({
  current_mileage: 50_000,
  maintenance_interval_km: 10_000,
  last_maintenance_mileage: 40_000,
  km_per_liter: 3,
  license_plate: "ABC1D23",
  description: "Caminhão",
}));

vi.mock(
  "@/app/(protected)/_components/shared/searches/search-vehicle-by-id-business",
  () => ({
    useFetchVehicleData: () => ({ data: vehicleData, isLoading: false }),
  }),
);

// The map needs Leaflet; the photo field loads through its own loader.
vi.mock("next/dynamic", async () => {
  const ReactModule = await import("react");

  return {
    default: (
      loader: () => Promise<React.ComponentType<Record<string, unknown>>>,
    ) => {
      const source = String(loader);

      if (source.includes("location-picker")) return () => null;

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

vi.mock("@/app/(protected)/_components/shared/custom/location-picker", () => ({
  default: () => null,
}));
vi.mock("@/features/fuel/form/context-panels", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/features/fuel/form/context-panels")
  >()),
  LocationField: () => null,
}));

import { QueryClient, QueryClientProvider } from "react-query";

import { VehicleFormDialog } from "@/features/vehicle/form-dialog";
import { VehicleTypeFormDialog } from "@/features/vehicle-type/form-dialog";
import { SupplierFormDialog } from "@/features/supplier/form-dialog";
import { DriverFormDialog } from "@/features/driver/form-dialog";
import { FineFormDialog } from "@/features/fine/form-dialog";
import { FuelTypeFormDialog } from "@/features/fuel-type/form-dialog";
import { CreateFuelDialog } from "@/features/fuel/create-dialog";
import { AccountPayableFormDialog } from "@/features/account-payable/form-dialog";
import { CreateServiceOrderFormSubmit } from "@/features/service-order/create-form/submit";
import { CardModal } from "@/app/(protected)/_components/kanban/card/card-modal";
import { useAuthStore } from "@/store/auth-store";

import type { VehicleRow } from "@/features/vehicle/types";

(globalThis as { React?: typeof React }).React = React;

const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

let root: Root | null = null;

async function mount(element: ReactElement): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => root!.render(element));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
}

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const errorOf = (id: string) =>
  document.getElementById(`${id}-error`)?.textContent ?? null;
const button = (label: RegExp) =>
  Array.from(document.querySelectorAll("button")).find((element) =>
    label.test(element.textContent ?? ""),
  )!;

async function click(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.click();
  });
  await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
}

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

/** Walks a wizard to its last step (each step mocked as "Continuar"). */
async function continueSteps(): Promise<void> {
  for (let guard = 0; guard < 5; guard += 1) {
    const next = document.querySelector<HTMLButtonElement>("[data-continue]");
    if (!next) return;
    await click(next);
  }
}

let consoleSpy: { mockRestore: () => void } | null = null;

beforeEach(() => {
  // This runner's react-dom predates function `<form action>`: the warning
  // is about the test runtime, not the forms.
  const consoleError = console.error.bind(console);
  consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation((...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("Invalid value for prop")
      )
        return;
      consoleError(...args);
    });

  useAuthStore.setState({ role: "MASTER" });
});

afterEach(async () => {
  consoleSpy?.mockRestore();
  await act(async () => root?.unmount());
  root = null;
  actionState.current = undefined;
  document.body.innerHTML = "";
});

const vehicleRow = {
  id: "018f0000-0000-7000-8000-0000000000e1",
  // Saved before today's spacing rule: never judged unless it is edited.
  description: "Caminhão  baú 01",
  license_plate: "ABC1D23",
  brand: "Volvo",
  model: "FH 540",
  acquisition_date: "2024-01-10T03:00:00.000Z",
  fleet_type: "OWNED",
  fleet_id: null,
  last_maintenance_date: null,
  current_mileage: 50_000,
  last_maintenance_mileage: 40_000,
  maintenance_interval_km: 10_000,
  maintenance_interval_months: 6,
  renavam: "12345678901",
  manufacturing_year: "2020-01-01T00:00:00.000Z",
  model_year: "2021-01-01T00:00:00.000Z",
  km_per_liter: 3,
  number_of_axles: 3,
  status: "ACTIVE",
  vehicleTypeId: null,
  fuelTypeId: "018f0000-0000-7000-8000-0000000000f1",
  driverId: null,
  branchId: null,
  businessId: BUSINESS,
  created_at: "2024-01-10T03:00:00.000Z",
  updated_at: "2024-01-10T03:00:00.000Z",
} as unknown as VehicleRow;

describe("the vehicle dialog", () => {
  const open = (vehicle?: VehicleRow) =>
    mount(
      createElement(VehicleFormDialog, {
        businessId: BUSINESS,
        vehicle,
        open: true,
        onOpenChange: () => {},
      }),
    ).then(continueSteps);

  it("keeps Criar veículo enabled on an empty form", async () => {
    await open();

    expect(button(/Criar veículo/).disabled).toBe(false);
  });

  it("calls an empty description missing on leaving it and clears it on the keystroke that fixes it", async () => {
    // Red before: no client check at all, and the schema said "mínimo 3".
    await open();
    const description = $<HTMLInputElement>("#description");

    await leave(description, $("#license_plate"));
    expect(errorOf("description")).toBe("A descrição é obrigatória.");

    await type(description, "Ca");
    expect(errorOf("description")).toBe(
      "A descrição deve ter no mínimo 3 caracteres.",
    );

    await type(description, "Caminhão baú 01");
    expect(errorOf("description")).toBeNull();
    expect(description.hasAttribute("aria-invalid")).toBe(false);
  });

  it("on Criar stops the submit, shows every missing field and focuses the first", async () => {
    await open();

    const passed = await submit($<HTMLFormElement>("form"));

    expect(passed).toBe(false);
    expect(errorOf("description")).toBe("A descrição é obrigatória.");
    expect(errorOf("license_plate")).toBe("A placa é obrigatória.");
    expect(errorOf("fleet_type")).toBe("Selecione o tipo de frota.");
    expect(errorOf("current_mileage")).toBe(
      "A quilometragem atual é obrigatória.",
    );
    expect(document.activeElement).toBe($("#description"));
  });

  it("keeps Salvar disabled until a change, and never judges an untouched legacy value", async () => {
    await open(vehicleRow);

    expect(button(/Salvar alterações/).disabled).toBe(true);

    await type($<HTMLInputElement>("#brand"), "Scania");
    expect(button(/Salvar alterações/).disabled).toBe(false);

    // The double space of the stored description is not sent, so not judged.
    expect(await submit($<HTMLFormElement>("form"))).toBe(true);
    expect(errorOf("description")).toBeNull();
  });

  it("judges an edited field with the action's own rule", async () => {
    await open(vehicleRow);
    const axles = $<HTMLInputElement>("#number_of_axles");

    await type(axles, "");
    await leave(axles);

    expect(errorOf("number_of_axles")).toBe("O número de eixos é obrigatório.");
    expect(await submit($<HTMLFormElement>("form"))).toBe(false);
  });
});

describe("the fuel type dialog", () => {
  const open = () =>
    mount(
      createElement(FuelTypeFormDialog, {
        businessId: BUSINESS,
        isOpen: true,
        onClose: () => {},
      }),
    );

  it("keeps Criar Combustível enabled and says what is missing on submit", async () => {
    // Red before: the button stayed disabled until a fuel was picked.
    await open();

    expect(button(/Criar Combustível/).disabled).toBe(false);
    expect(await submit($<HTMLFormElement>("form"))).toBe(false);
    expect(errorOf("description")).toBe("Selecione o combustível.");
  });
});

describe("the refueling dialog", () => {
  const openToForm = async () => {
    await mount(createElement(CreateFuelDialog, { businessId: BUSINESS }));
    await click(button(/Criar Abastecimento/));
    await continueSteps();
  };

  it("refuses zero liters as soon as the field is left", async () => {
    await openToForm();
    const liters = $<HTMLInputElement>("#liters_amount_display");

    await type(liters, "0");
    await leave(liters);

    // Red before: "deve ser um valor positivo", and only after the round trip.
    expect(errorOf("liters_amount_display")).toBe(
      "A quantidade de litros deve ser maior que zero.",
    );

    await type(liters, "45,5");
    expect(errorOf("liters_amount_display")).toBeNull();
  });

  it("asks for the odometer photo on submit, before any upload", async () => {
    await openToForm();

    expect(button(/^Criar Abastecimento$/).disabled).toBe(false);
    expect(await submit($<HTMLFormElement>("form"))).toBe(false);

    expect(document.body.textContent).toContain(
      "A foto do odômetro é obrigatória.",
    );
    expect(errorOf("refueling_date")).toBe(
      "A data do abastecimento é obrigatória.",
    );
    expect(errorOf("current_mileage_display")).toBe(
      "A quilometragem atual do veículo é obrigatória.",
    );
  });

  it("notes a km at or below the vehicle's without calling it an error", async () => {
    await openToForm();
    const mileage = $<HTMLInputElement>("#current_mileage_display");

    await type(mileage, "49000");
    await leave(mileage);

    expect(errorOf("current_mileage_display")).toBeNull();
    expect(document.body.textContent).toContain(
      "Igual ou abaixo da atual do veículo (50.000 km): só é aceita se houver leitura posterior à data escolhida.",
    );
  });
});

describe("the bill dialog", () => {
  const open = () =>
    mount(
      createElement(AccountPayableFormDialog, {
        businessId: BUSINESS,
        isOpen: true,
        onClose: () => {},
      }),
    );

  it("says at once that a paid amount needs a payment date, without waiting for the rest", async () => {
    // Red before: an object refine, run only once every field was valid.
    await open();
    const paid = $<HTMLInputElement>("#amount_paid");

    await type(paid, "100");
    await leave(paid);

    expect(errorOf("amount_paid")).toContain(
      "Se há data de pagamento, deve haver valor pago e vice-versa.",
    );

    await type(paid, "");
    expect(errorOf("amount_paid")).toBeNull();
  });

  it("on Criar shows the payee and the required links in the action's words", async () => {
    await open();

    expect(await submit($<HTMLFormElement>("form"))).toBe(false);

    expect(errorOf("category")).toBe("Selecione a categoria da conta.");
    expect($('[data-picker="branch"]').textContent).toBe("Selecione a filial.");
    expect($('[data-picker="supplier"]').textContent).toBe(
      "Informe o favorecido: um fornecedor cadastrado ou um nome.",
    );
    expect(errorOf("amount")).toBe("O valor é obrigatório.");
  });
});

describe("the service order creation", () => {
  const open = (initialFormValues: Record<string, string>) =>
    mount(
      createElement(
        "form",
        null,
        createElement(CreateServiceOrderFormSubmit, {
          state: {},
          businessId: BUSINESS,
          vehicleId: vehicleRow.id,
          canEditSnapshot: false,
          onBack: () => {},
          latitude: null,
          longitude: null,
          isLoadingLocation: false,
          handleLocationChange: () => {},
          handleLocationLoadingChange: () => {},
          initialFormValues,
          onFormValuesChange: () => {},
        }),
      ),
    );

  it("keeps Criar enabled with a mileage behind the vehicle and explains it on submit", async () => {
    // Red before: the button was disabled and the reason sat apart from the field.
    await open({
      date: "2026-10-01T03:00:00.000Z",
      completion_date: "2026-10-02T03:00:00.000Z",
      maintenance_type: "EXTERNAL",
      total_amount: "500,00",
      new_mileage_after_service: "49000",
    });

    expect(button(/Criar Ordem de Serviço/).disabled).toBe(false);
    expect(await submit($<HTMLFormElement>("form"))).toBe(false);
    expect(errorOf("new_mileage_after_service")).toBe(
      "A nova quilometragem não pode ser menor que 50.000 km (atual do veículo).",
    );
    expect(document.activeElement?.id).toBe("new_mileage_after_service");
  });

  it("says a completion before the order's date at once", async () => {
    await open({
      date: "2026-10-05T03:00:00.000Z",
      completion_date: "2026-10-02T03:00:00.000Z",
    });

    expect(await submit($<HTMLFormElement>("form"))).toBe(false);
    expect(errorOf("completion_date")).toBe(
      "A data de conclusão não pode ser anterior à data da ordem de serviço",
    );
    expect(errorOf("maintenance_type")).toBe("Selecione o tipo de manutenção.");
  });
});

describe("the kanban card dialog", () => {
  const open = () =>
    mount(
      createElement(CardModal, {
        isOpen: true,
        onClose: () => {},
        card: null,
        columnId: "018f0000-0000-7000-8000-0000000000c1",
        businessId: BUSINESS,
      }),
    );

  it("keeps Criar Card enabled and calls a title of spaces missing", async () => {
    // Red before: disabled until title, description and date were filled, and
    // "   " read "não deve conter espaços consecutivos".
    await open();

    expect(button(/Criar Card/).disabled).toBe(false);

    const title = $<HTMLInputElement>("#title");
    await type(title, "   ");
    await leave(title);

    expect(errorOf("title")).toBe("O título do card é obrigatório.");

    await type(title, "Conferir documentos");
    expect(errorOf("title")).toBeNull();
  });

  it("on Criar stops the submit and lists the description and the due date", async () => {
    await open();

    expect(await submit($<HTMLFormElement>("form"))).toBe(false);
    expect(errorOf("description")).toBe("A descrição é obrigatória.");
    expect(errorOf("dueDate")).toBe("A data de vencimento é obrigatória.");
  });
});

/** The CEP hook behind supplier and driver reads through react-query. */
const withQueries = (element: ReactElement) =>
  createElement(QueryClientProvider, { client: new QueryClient() }, element);

describe("the supplier dialog", () => {
  const open = () =>
    mount(
      withQueries(
        createElement(SupplierFormDialog, {
          businessId: BUSINESS,
          isOpen: true,
          onClose: () => {},
        }),
      ),
    );

  it("calls an untouched name missing in Portuguese on Criar", async () => {
    // Red before: the CEP hook leaves `name` undefined on create and zod
    // answered with its English default, "Required".
    await open();

    expect(button(/Criar Fornecedor/).disabled).toBe(false);
    expect(await submit($<HTMLFormElement>("form"))).toBe(false);
    expect(errorOf("name")).toBe("O nome do fornecedor é obrigatório.");
    expect(errorOf("cnpj")).toBe("O CNPJ é obrigatório.");
    expect(document.activeElement).toBe($("#name"));
  });

  it("calls an untouched name missing on leaving it and clears it once typed", async () => {
    await open();

    await leave($("#name"), $("#cnpj"));
    expect(errorOf("name")).toBe("O nome do fornecedor é obrigatório.");

    await type($<HTMLInputElement>("#name"), "Oficina Central");
    expect(errorOf("name")).toBeNull();
  });
});

describe("the driver dialog", () => {
  it("on Criar Motorista lists every missing field in Portuguese and focuses the first", async () => {
    await mount(
      withQueries(
        createElement(DriverFormDialog, {
          businessId: BUSINESS,
          isOpen: true,
          onClose: () => {},
        }),
      ),
    );
    await click(button(/Prosseguir/));

    expect(button(/Criar Motorista/).disabled).toBe(false);
    expect(await submit($<HTMLFormElement>("form"))).toBe(false);

    expect(errorOf("name")).toBe("O nome é obrigatório.");
    expect(errorOf("birth_date")).toBe("A data de nascimento é obrigatória.");
    expect(errorOf("cpf")).toBe("O CPF é obrigatório.");
    expect(errorOf("cnh")).toBe("O número da CNH é obrigatório.");
    expect(errorOf("cep")).toBe("O CEP é obrigatório.");
    for (const id of ["status", "contract_type", "city", "uf", "street"]) {
      expect(errorOf(id)).toMatch(/obrigatóri|Selecione/);
    }
    expect(document.body.textContent).not.toMatch(/Required|Expected/);
    expect(document.activeElement).toBe($("#name"));
  });
});

describe("the fine details step", () => {
  it("on Registrar lists the missing dates, amount and points in Portuguese", async () => {
    await mount(
      createElement(FineFormDialog, {
        businessId: BUSINESS,
        isOpen: true,
        onClose: () => {},
      }),
    );
    await continueSteps();

    expect(await submit($<HTMLFormElement>("form"))).toBe(false);

    expect(errorOf("fine-violation-date")).toBe(
      "A data da infração é obrigatória.",
    );
    expect(errorOf("fine-due-date")).toBe(
      "A data de vencimento é obrigatória.",
    );
    expect(errorOf("fine-amount")).toBe("O valor da multa é obrigatório.");
    expect(errorOf("fine-points")).toBe("A pontuação é obrigatória.");
    expect(errorOf("fine-payment-date")).toBeNull();
  });
});

describe("a server field error", () => {
  it("clears on the vehicle dialog once the field is edited", async () => {
    // Red before: the errors object was rebuilt on every render, so the
    // primitive re-snapshotted the values and never saw the edit.
    actionState.current = {
      createVehicleError: {
        license_plate: ["Já existe um veículo com essa placa."],
      },
    };
    await mount(
      createElement(VehicleFormDialog, {
        businessId: BUSINESS,
        open: true,
        onOpenChange: () => {},
      }),
    ).then(continueSteps);

    expect(errorOf("license_plate")).toBe(
      "Já existe um veículo com essa placa.",
    );

    await type($<HTMLInputElement>("#license_plate"), "XYZ9A88");
    expect(errorOf("license_plate")).toBeNull();
  });

  it("clears on the vehicle type dialog once the field is edited", async () => {
    actionState.current = {
      createVehicleTypeError: {
        description: ["Já existe um tipo com esse nome."],
      },
    };
    await mount(
      createElement(VehicleTypeFormDialog, {
        businessId: BUSINESS,
        open: true,
        onOpenChange: () => {},
      }),
    );

    expect(errorOf("description")).toBe("Já existe um tipo com esse nome.");

    await type($<HTMLInputElement>("#description"), "Bitrem");
    expect(errorOf("description")).toBeNull();
  });

  it("clears on the bill dialog once the field is edited", async () => {
    actionState.current = {
      createAccountPayableError: { amount: ["Valor recusado pelo servidor."] },
    };
    await mount(
      createElement(AccountPayableFormDialog, {
        businessId: BUSINESS,
        isOpen: true,
        onClose: () => {},
      }),
    );

    expect(errorOf("amount")).toBe("Valor recusado pelo servidor.");

    await type($<HTMLInputElement>("#amount"), "123");
    expect(errorOf("amount")).toBeNull();
  });
});
