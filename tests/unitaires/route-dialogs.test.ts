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
 * The route dialogs as the dispatcher meets them (Entregas 12, Frotas 5):
 *
 * - Cancelar Rota in the Cancelar Entrega pattern, with "Validações e
 *   consequências" said by status — a PLANNED route's driver is never told
 *   (DLVB-16);
 * - the row menu alone, without the extra eye button (DLVB-18, decision 3.5);
 * - Editar rota: "Salvar alterações" waits for a change, and the planned
 *   times travel as the ISO instant with offset they are stored as
 *   (REV-8, DLVB-11, DLVB-15).
 *
 * The old "Atribuir Motorista e Veículo" dialog is gone (decision 14.7): the
 * table's "Adicionar à rota" lives in route-assignment-unit-components.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const BUSINESS = "018f0000-0000-7000-8000-00000000000b";
const DRIVER = "018f0000-0000-7000-8000-0000000000d1";
const VEHICLE = "018f0000-0000-7000-8000-0000000000e1";

const calls = vi.hoisted(() => ({
  cancelled: [] as Array<{ routeId: string; reason: string }>,
  preview: {
    suggestedVehicleId: null as string | null,
    warnings: [] as Array<{ code: string; message: string }>,
    responsible: null as { id: string; name: string } | null,
    timeZone: "America/Manaus",
  },
  /** The last bounds each date-time picker was drawn with, by field name. */
  pickers: {} as Record<string, { fromDate?: Date; toDate?: Date }>,
}));

// The real picker, with the days it was allowed to offer written down.
vi.mock(
  "@/app/(protected)/_components/shared/custom/date-time-picker-field",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/app/(protected)/_components/shared/custom/date-time-picker-field")
      >();
    const { createElement: h } = await import("react");

    const Recording = (
      props: Parameters<typeof actual.DateTimePickerField>[0],
    ) => {
      calls.pickers[props.name] = {
        fromDate: props.fromDate,
        toDate: props.toDate,
      };

      return h(actual.DateTimePickerField, props);
    };

    return { ...actual, DateTimePickerField: Recording };
  },
);

// Only Next's bundled react-dom has the form hooks; this runner's does not.
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();

  return {
    ...actual,
    useFormState: (_action: unknown, initial: unknown) => [initial, () => {}],
    useFormStatus: () => ({ pending: false }),
  };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/dashboard/routes",
}));

vi.mock("@/store/auth-store", () => {
  const state = {
    role: "BUSINESS_ADMIN",
    businessId: "018f0000-0000-7000-8000-00000000000b",
    permissions: [],
    isLoaded: true,
    loadAuth: () => {},
  };

  return {
    useAuthStore: (selector?: (value: typeof state) => unknown) =>
      selector ? selector(state) : state,
  };
});

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

vi.mock("@/actions/revalidate", () => ({ revalidateTagName: async () => {} }));

vi.mock("@/actions/route/route-operations", () => ({
  cancelRoute: async (_businessId: string, routeId: string, reason: string) => {
    calls.cancelled.push({ routeId, reason });
    return { success: true, message: "Rota cancelada." };
  },
  releaseRoute: async () => ({ success: true, message: "" }),
  addRouteStops: async () => ({ success: true, message: "" }),
  removeRouteStop: async () => ({ success: true, message: "" }),
  reorderRouteStops: async () => ({ success: true, message: "" }),
}));

vi.mock("@/actions/route/assignment-preview", () => ({
  getAssignmentPreview: async ({
    driverId,
    vehicleId,
    scheduledDate,
  }: {
    driverId: string;
    vehicleId?: string;
    scheduledDate?: string;
  }) => ({
    success: true,
    message: "",
    data: {
      scheduled_date: scheduledDate ?? "2026-09-17",
      timeZone: calls.preview.timeZone,
      driver: { id: driverId, name: "João", status: "ACTIVE" },
      responsibleVehicles: calls.preview.suggestedVehicleId
        ? [
            {
              id: calls.preview.suggestedVehicleId,
              license_plate: "ABC1D23",
              description: "Caminhão",
              status: "ACTIVE",
            },
          ]
        : [],
      suggestedVehicleId: calls.preview.suggestedVehicleId,
      vehicle: vehicleId
        ? {
            id: vehicleId,
            license_plate: "ABC1D23",
            description: "Caminhão",
            status: "ACTIVE",
            responsible: calls.preview.responsible,
          }
        : null,
      warnings: calls.preview.warnings,
    },
  }),
}));

// The pickers read their lists here; the dialogs under test are not about
// paging, so each list is one fixed page.
vi.mock("@/hooks/use-cursor-search", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-cursor-search")>()),
  useCursorSearch: ({ queryKey }: { queryKey: unknown[] }) => ({
    items:
      queryKey[0] === "driver"
        ? [{ id: DRIVER, name: "João", cnh: "123" }]
        : [
            {
              id: VEHICLE,
              license_plate: "ABC1D23",
              description: "Caminhão",
              status: "ACTIVE",
              driverId: DRIVER,
            },
          ],
    lastElementRef: () => {},
    isFetching: false,
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
    hasError: false,
    errorMessage: null,
    refetch: () => {},
    isSearchSettled: true,
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CancelRouteDialog } from "@/features/routes/cancel-dialog";
import { RouteRowActions } from "@/features/routes/row-actions";
import {
  RouteFormDialog,
  initialRouteValues,
  routeEditChanges,
} from "@/features/routes/form-dialog";
import { localDateKey } from "@/lib/format-values";

import type { RouteDetail } from "@/actions/route/get-route";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

beforeEach(() => {
  calls.cancelled.length = 0;
  calls.preview.suggestedVehicleId = null;
  calls.preview.warnings = [];
  calls.preview.responsible = null;
  calls.preview.timeZone = "America/Manaus";
  calls.pickers = {};
});

/**
 * A company zone that differs from the runner's, with the instants its day
 * of the 17th starts and ends at: the expected picker days are read off
 * those instants on the runner's own calendar, never computed the way the
 * code under test computes them.
 */
const RUNNER_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const FAR_COMPANY =
  RUNNER_ZONE === "America/Noronha"
    ? { zone: "America/Rio_Branco", hoursBehindUtc: 5 }
    : { zone: "America/Noronha", hoursBehindUtc: 2 };

/**
 * The instants the company's day `key` starts and ends at. Both zones have a
 * fixed offset (no daylight saving in Brazil since 2019), so the day is
 * [00:00, 24:00) shifted by it.
 */
function companyDay(key: string): { start: number; end: number } {
  const [year, month, day] = key.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day, FAR_COMPANY.hoursBehindUtc);

  return { start, end: start + 24 * 60 * 60 * 1000 - 1 };
}

/** Local midnight of the runner-local day an instant falls on. */
function localDayOf(instant: number): number {
  const at = new Date(instant);

  return new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();
}

function pickerDays(name: string): { from?: number; to?: number } {
  const bounds = calls.pickers[name];

  expect(bounds, `seletor ${name} não desenhado`).toBeDefined();

  return { from: bounds.fromDate?.getTime(), to: bounds.toDate?.getTime() };
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function settle(times = 3): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function mount(element: React.ReactElement): Promise<HTMLElement> {
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

  return host;
}

function button(label: RegExp): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find((candidate) =>
    label.test((candidate.textContent ?? "").trim()),
  );

  expect(found, `botão ${label} não encontrado`).toBeDefined();

  return found as HTMLButtonElement;
}

function route(overrides: Partial<RouteDetail> = {}): RouteDetail {
  return {
    id: "018f0000-0000-7000-8000-0000000000a7",
    code: 7,
    name: "Zona Sul",
    status: "PLANNED",
    scheduled_date: "2026-09-17T00:00:00.000Z",
    destination: "CD Cajamar",
    planned_departure_at: "2026-09-17T11:00:00.000Z",
    planned_arrival_at: null,
    started_at: null,
    completed_at: null,
    cancellation_reason: null,
    driverId: DRIVER,
    vehicleId: VEHICLE,
    driver: { id: DRIVER, name: "João" },
    vehicle: { id: VEHICLE, license_plate: "ABC1D23" },
    stops: [
      {
        id: "stop-1",
        sequence: 10,
        status: "PENDING",
        arrived_at: null,
        completed_at: null,
        routeId: "018f0000-0000-7000-8000-0000000000a7",
        deliveryId: "delivery-1",
        delivery: {
          id: "delivery-1",
          kind: "DELIVERY",
          status: "PENDING",
          recipient_name: "Maria",
          city: "São Paulo",
          uf: "SP",
          street: "Rua A",
          address_number: null,
          neighborhood: null,
        },
      },
    ],
    created_at: "2026-09-16T12:00:00.000Z",
    updated_at: "2026-09-16T12:00:00.000Z",
    ...overrides,
  };
}

describe("the Cancelar Rota dialog", () => {
  const open = (status: RouteDetail["status"]) =>
    mount(
      createElement(CancelRouteDialog, {
        businessId: BUSINESS,
        route: route({ status }),
        isOpen: true,
        onClose: () => {},
      }),
    );

  it("does not promise a notice to the driver of a route still in planning", async () => {
    // Red before: "O motorista será avisado no aplicativo." for every route,
    // while the API only tells the driver once the route is released.
    await open("PLANNED");

    const text = document.body.textContent ?? "";

    expect(text).toContain("Cancelar Rota 7");
    expect(text).not.toContain("será avisado");
    expect(text).toContain("não a vê no aplicativo e não é avisado");
    expect(text).toContain(
      "O motorista não é avisado: a rota ainda não tinha sido liberada para ele.",
    );
  });

  it("says the driver is told once the route was handed over", async () => {
    await open("IN_PROGRESS");

    const text = document.body.textContent ?? "";

    expect(text).toContain("Esta rota já saiu.");
    expect(text).toContain("O motorista é avisado no aplicativo");
    expect(text).toContain(
      "O veículo volta a ficar disponível para outra rota.",
    );
  });

  it("lists the validations and consequences, and keeps the reason required", async () => {
    // Red before: no "Validações e consequências" list at all.
    await open("RELEASED");

    const text = document.body.textContent ?? "";

    expect(text).toContain("Validações e consequências:");
    expect(text).toContain(
      "A parada ainda não resolvida é cancelada e a entrega volta para a lista de entregas disponíveis, sem motorista.",
    );
    expect(text).toContain("Esta ação não pode ser desfeita");

    await act(async () => button(/^Cancelar Rota$/).click());
    await settle();

    const reason = document.getElementById("cancel-route-reason")!;

    expect(reason.getAttribute("aria-invalid")).toBe("true");
    expect(calls.cancelled).toEqual([]);

    // Cancelar + the main action, side by side (decision 3.2).
    const footer = document.querySelector("[data-dialog-footer]");

    expect(footer?.getAttribute("data-dialog-footer")).toBe("fill");
    expect(
      [...footer!.querySelectorAll("button")].map((node) =>
        node.textContent?.trim(),
      ),
    ).toEqual(["Cancelar", "Cancelar Rota"]);
  });
});

describe("the route row", () => {
  it("offers the menu alone, without the extra eye button", async () => {
    // Red before: a ghost icon button "Ver detalhes da rota 7" sat beside
    // the menu, repeating its first item.
    const host = await mount(
      createElement(RouteRowActions, { route: route() }),
    );

    expect(
      host.querySelector('[aria-label^="Ver detalhes da rota"]'),
    ).toBeNull();
    expect(host.querySelectorAll("button")).toHaveLength(1);
    expect(host.querySelector("svg.lucide-eye")).toBeNull();
  });

  it("names the way to the route page 'Ver detalhes', like every other row menu", async () => {
    // Red before: the item read "Abrir rota", the only menu whose first item
    // was not "Ver detalhes" (decision 3.5; route design §5: "Ver detalhes"
    // navigates to the page). Found by tests/ui/row-actions-design.spec.ts.
    const host = await mount(
      createElement(RouteRowActions, { route: route() }),
    );

    await act(async () => {
      host.querySelector("button")!.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          ctrlKey: false,
        }),
      );
    });

    const labels = [...document.body.querySelectorAll('[role="menuitem"]')].map(
      (item) => item.textContent?.trim(),
    );

    expect(labels[0]).toBe("Ver detalhes");
    expect(labels).not.toContain("Abrir rota");
  });
});

describe("the Editar rota dialog", () => {
  const openEdit = () =>
    mount(
      createElement(RouteFormDialog, {
        businessId: BUSINESS,
        isOpen: true,
        onClose: () => {},
        route: route(),
      }),
    );

  it("keeps Salvar alterações disabled until something changes", async () => {
    // Red before: enabled on open, and a save wrote the same row back.
    await openEdit();

    expect(button(/^Salvar alterações$/).disabled).toBe(true);

    const name = document.getElementById("name") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;

    await act(async () => {
      setter.call(name, "Zona Norte");
      name.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await settle();

    expect(button(/^Salvar alterações$/).disabled).toBe(false);
  });

  it("does not fill the driver's truck into a route opened for editing", async () => {
    // A route planned without a vehicle, whose driver has exactly one.
    // Red before: the preview's suggestion filled it on open, so the untouched
    // form read as changed and a save slipped the vehicle in.
    calls.preview.suggestedVehicleId = VEHICLE;

    await mount(
      createElement(RouteFormDialog, {
        businessId: BUSINESS,
        isOpen: true,
        onClose: () => {},
        route: route({ vehicleId: null, vehicle: null }),
      }),
    );
    await settle(5);

    const vehicle = document.querySelector(
      'input[type="hidden"][name="vehicleId"]',
    ) as HTMLInputElement;

    expect(vehicle.value).toBe("");
    expect(button(/^Salvar alterações$/).disabled).toBe(true);
  });

  it("sends the company's zone for the day rules once the preview answered", async () => {
    // Red before: the browser's zone travelled, and a MASTER elsewhere got a
    // verdict the API (company zone) contradicted.
    await openEdit();
    await settle(5);

    const zone = document.querySelector(
      'input[type="hidden"][name="plan_time_zone"]',
    ) as HTMLInputElement;

    expect(zone.value).toBe("America/Manaus");
  });

  it("offers the company's day on this screen's calendar in the time pickers", async () => {
    // A company in another zone than the runner's. Red before: both pickers
    // were bounded to the 17th of THIS calendar, which starts and ends at
    // other instants than the company's 17th the rule judges.
    calls.preview.timeZone = FAR_COMPANY.zone;

    await openEdit();
    await settle(5);

    const { start, end } = companyDay("2026-09-17");

    expect(pickerDays("planned_departure_at")).toEqual({
      from: localDayOf(start),
      to: localDayOf(end),
    });
    expect(pickerDays("planned_arrival_at").from).toBe(localDayOf(start));
  });

  it("tells the API only what changed", async () => {
    // Red before: the day and both times always went, and were re-judged,
    // so a route whose stored times predate the rule could not be renamed.
    await openEdit();

    const form = () => new FormData(document.querySelector("form")!);

    expect(routeEditChanges(form(), initialRouteValues(route()))).toEqual([]);

    const name = document.getElementById("name") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;

    await act(async () => {
      setter.call(name, "Zona Norte");
      name.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await settle();

    expect(routeEditChanges(form(), initialRouteValues(route()))).toEqual([
      "name",
    ]);
  });

  it("posts the planned departure as the ISO instant it is stored as", async () => {
    // Red before: `slice(0, 16)` of the UTC ISO went into a datetime-local
    // input — the UTC wall time, posted back without an offset.
    await openEdit();

    const hidden = document.querySelector(
      'input[type="hidden"][name="planned_departure_at"]',
    ) as HTMLInputElement;

    expect(hidden.value).toBe("2026-09-17T11:00:00.000Z");

    expect(document.querySelector('input[type="datetime-local"]')).toBeNull();
  });

  it("marks the optional fields and shows what was planned", async () => {
    await openEdit();

    const labels = [...document.querySelectorAll("label")].map((node) =>
      node.textContent?.replace(/\s+/g, " ").trim(),
    );

    expect(labels).toEqual(
      expect.arrayContaining([
        "Nome da rota (opcional)",
        "Destino (opcional)",
        "Saída prevista (opcional)",
        "Retorno previsto (opcional)",
      ]),
    );

    expect(
      (document.getElementById("destination") as HTMLInputElement).value,
    ).toBe("CD Cajamar");

    // Red before: `justify-end` buttons; now Cancelar + Salvar share the row.
    expect(
      document
        .querySelector("[data-dialog-footer]")
        ?.getAttribute("data-dialog-footer"),
    ).toBe("fill");
  });
});
