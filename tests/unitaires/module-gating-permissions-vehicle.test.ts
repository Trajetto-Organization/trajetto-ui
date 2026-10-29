import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Module gating, second round (review of 08/10/2026): the permission pickers
 * and the vehicle form still offered the other module's things. A company
 * without Gestão de Frotas is not asked about Multas or revisions, and one
 * without Entregas is not asked about deliveries or shown "Em Rota".
 */
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard/permission",
}));

// The canary hooks Next ships; the test's React does not have them.
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormState: (_action: unknown, initial: unknown) => [initial, () => {}],
  useFormStatus: () => ({ pending: false }),
}));

// Server actions (network). The dialogs' own rendering is under test.
vi.mock("@/actions/permission/create-permission", () => ({
  handleCreatePermission: vi.fn(async () => ({})),
}));
vi.mock("@/actions/permission/update-permission", () => ({
  handleUpdatePermission: vi.fn(async () => ({})),
}));
vi.mock("@/actions/profile-access/bulk-configure-permissions", () => ({
  handleBulkConfigurePermissions: vi.fn(async () => ({})),
}));
vi.mock("@/actions/revalidate", () => ({
  revalidateTagName: vi.fn(async () => {}),
}));

// The profile picker loads pages from the API; it plays no part here.
vi.mock(
  "@/app/(protected)/_components/shared/searches/search-profile-access",
  () => ({
    SearchProfileAccess: () => null,
  }),
);

// The driver's vehicle list reads pages from the API; one vehicle stands in.
vi.mock("@/app/(protected)/_components/driver/vehicles/hooks", () => ({
  useDriverVehicles: () => ({
    errorMessage: null,
    isModalOpen: false,
    lastElementRef: () => {},
    refetch: () => {},
    selectedVehicle: null,
    setIsModalOpen: () => {},
    setSelectedVehicle: () => {},
    showSpinner: false,
    vehicles: [
      {
        id: "v1",
        license_plate: "ABC1D23",
        description: "Truck",
        brand: "Volvo",
        model: "FH",
        status: "ACTIVE",
        current_mileage: 1000,
        last_maintenance_mileage: 900,
        maintenance_interval_km: 10000,
        fuelType: { description: "Diesel" },
        vehicleType: { description: "Caminhão" },
      },
    ],
    hasError: false,
    isFetching: false,
    isLoading: false,
    isLoaded: true,
  }),
}));

// Radix Select mounts its options only when opened by a pointer, which
// happy-dom does not drive; this stand-in lists exactly the options the
// dialog hands it, which is what is being proven.
vi.mock("@/app/(protected)/_components/shared/custom/select-field", () => ({
  SelectField: ({
    options,
  }: {
    options: Array<{ value: string; label: string }>;
  }) =>
    createElement(
      "ul",
      null,
      options.map((option) =>
        createElement("li", { key: option.value }, option.label),
      ),
    ),
}));

import { PermissionFormDialog } from "@/features/permission/form-dialog";
import { BulkConfigurePermissionsDialog } from "@/app/(protected)/_components/shared/bulk-configure-permissions-dialog";
import {
  resourceFacetLabels,
  resourceOptions,
} from "@/features/permission/lib/permission-rules";
import { permissionKeyModule, permissionKeysInPlan } from "@/lib/route-access";
import { permissionKeys } from "@/lib/permissions";
import { VehicleFields } from "@/features/vehicle/form-dialog/fields";
import { VehicleStats } from "@/features/vehicle/stats";
import { buildVehicleColumns } from "@/features/vehicle/table-columns";
import { DriverVehiclesList } from "@/app/(protected)/_components/driver/vehicles";
import {
  EMPTY_FORM,
  lockedMileageHint,
  showsMaintenanceFields,
  vehicleCreatePayload,
} from "@/features/vehicle/lib/form-values";
import { useAuthStore } from "@/store/auth-store";
import { createVehicleSchema } from "@/schemas/create-update-vehicle-schema";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
  // The matrix loads the profile's current rows on open: none.
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ permissions: [] }), { status: 200 }),
    ),
  );
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
  useAuthStore.setState({ role: null, enabledModules: null });
});

/** Renders and returns the whole body's text: dialogs portal out of the root. */
async function render(element: React.ReactElement): Promise<string> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  unmounts.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  await act(async () => {
    root.render(element);
  });

  return document.body.textContent ?? "";
}

const FLEET_RESOURCES =
  /Peças|Fornecedores|Ordens de Serviço|Contas a Pagar|Multas|Abastecimentos|Checklist dos Veículos/;
const DELIVERY_RESOURCES = /Entregas|Ocorrências de Entrega|Integrações/;
const SHARED_RESOURCES = [
  "Gerenciar Filiais",
  "Gerenciar Perfis de Acesso",
  "Gerenciar Permissões",
  "Gerenciar Cadastro de Usuários",
  "Gerenciar tipos de veículos",
  "Gerenciar tipos de combustíveis",
  "Gerenciar Motoristas",
  "Gerenciar Veículos",
  "Gerenciar Kanban",
];

const BUSINESS_ID = "018f0000-0000-7000-8000-00000000000a";

function session(role: "BUSINESS_ADMIN" | "MASTER", modules: string[] | null) {
  useAuthStore.setState({ role, enabledModules: modules });
}

describe("permission keys by module", () => {
  it("derives each key's module from the pages it guards", () => {
    expect(permissionKeyModule("fine_manage")).toBe("FLEET");
    expect(permissionKeyModule("service_order_manage")).toBe("FLEET");
    expect(permissionKeyModule("delivery_manage")).toBe("DELIVERIES");
    expect(permissionKeyModule("integration_manage")).toBe("DELIVERIES");
    // Guards no page of its own; managed inside Entregas.
    expect(permissionKeyModule("occurrence_manage")).toBe("DELIVERIES");
    // Shared ground: a delivery has a vehicle and a driver too.
    expect(permissionKeyModule("vehicle_manage")).toBeUndefined();
    expect(permissionKeyModule("fuel_type_manage")).toBeUndefined();
    expect(permissionKeyModule("kanban_manage")).toBeUndefined();
  });

  it("lists every key to the MASTER and when the modules are unknown", () => {
    expect(
      permissionKeysInPlan(permissionKeys, {
        role: "MASTER",
        enabledModules: ["FLEET"],
      }),
    ).toHaveLength(permissionKeys.length);
    expect(
      permissionKeysInPlan(permissionKeys, {
        role: "BUSINESS_ADMIN",
        enabledModules: null,
      }),
    ).toHaveLength(permissionKeys.length);
  });

  it("keeps the value being edited even when it is out of the plan", () => {
    const labels = resourceOptions(
      { role: "BUSINESS_ADMIN", enabledModules: ["DELIVERIES"] },
      "fine_manage",
    ).map((option) => option.label);

    expect(labels).toContain("Gerenciar Multas");
    expect(labels).not.toContain("Gerenciar Peças");
  });

  it("keeps a filter value of the other module only while rows of it exist", () => {
    const plan = { role: "BUSINESS_ADMIN" as const, enabledModules: ["FLEET"] };

    expect(Object.keys(resourceFacetLabels(plan, []))).not.toContain(
      "delivery_manage",
    );
    expect(
      Object.keys(resourceFacetLabels(plan, ["delivery_manage"])),
    ).toContain("delivery_manage");
  });
});

describe("permission form by module", () => {
  const renderForm = () =>
    render(
      createElement(PermissionFormDialog, {
        businessId: BUSINESS_ID,
        isOpen: true,
        onClose: () => {},
      }),
    );

  // Red before: "Recurso" listed Peças, Multas, OS, Abastecimentos... to a
  // company that hired only Entregas (resourceOptions ignored the plan).
  it("offers no fleet resource to a deliveries-only company", async () => {
    session("BUSINESS_ADMIN", ["DELIVERIES"]);
    const text = await renderForm();

    expect(text).toContain("Gerenciar Entregas");
    for (const label of SHARED_RESOURCES) expect(text).toContain(label);
    expect(text).not.toMatch(FLEET_RESOURCES);
  });

  // Red before: the same dialog offered Entregas and Ocorrências to a
  // fleet-only company.
  it("offers no deliveries resource to a fleet-only company", async () => {
    session("BUSINESS_ADMIN", ["FLEET"]);
    const text = await renderForm();

    expect(text).toContain("Gerenciar Multas");
    expect(text).not.toMatch(DELIVERY_RESOURCES);
  });

  it("offers every resource to the MASTER", async () => {
    session("MASTER", ["FLEET"]);
    const text = await renderForm();

    expect(text).toMatch(FLEET_RESOURCES);
    expect(text).toMatch(DELIVERY_RESOURCES);
  });
});

describe("profile-access permission matrix by module", () => {
  const renderMatrix = () =>
    render(
      createElement(BulkConfigurePermissionsDialog, {
        profileAccessId: "018f0000-0000-7000-8000-00000000000b",
        businessId: BUSINESS_ID,
        profileName: "Operação",
        isOpen: true,
        onClose: () => {},
      }),
    );

  // Red before: the matrix rendered every key in the platform.
  it("shows no fleet row to a deliveries-only company", async () => {
    session("BUSINESS_ADMIN", ["DELIVERIES"]);
    const text = await renderMatrix();

    expect(text).toContain("Gerenciar Ocorrências de Entrega");
    for (const label of SHARED_RESOURCES) expect(text).toContain(label);
    expect(text).not.toMatch(FLEET_RESOURCES);
  });

  it("shows no deliveries row to a fleet-only company", async () => {
    session("BUSINESS_ADMIN", ["FLEET"]);
    const text = await renderMatrix();

    expect(text).toContain("Gerenciar Contas a Pagar");
    expect(text).not.toMatch(DELIVERY_RESOURCES);
  });
});

describe("vehicle form by module", () => {
  const renderFields = (modules: string[] | null, role = "BUSINESS_ADMIN") =>
    render(
      createElement(VehicleFields, {
        values: EMPTY_FORM,
        onChange: () => {},
        disabled: false,
        mileageLocked: true,
        withMaintenance: showsMaintenanceFields({
          role,
          enabledModules: modules,
        }),
        mileageHint: lockedMileageHint(modules),
      }),
    );

  // Red before: "Revisão a cada (km) *" and "(meses) *" were required of a
  // company without Gestão de Frotas, and the hint named abastecimentos/OS.
  it("asks a deliveries-only company for no revision field", async () => {
    const text = await renderFields(["DELIVERIES"]);

    expect(text).toContain("Quilometragem atual");
    expect(text).not.toMatch(/revisão/i);
    expect(text).not.toMatch(/abastec|checklist|\bOS\b/i);
  });

  it("keeps the revision fields for a fleet company and the MASTER", async () => {
    expect(await renderFields(["FLEET"])).toContain("Revisão a cada (km) *");
    await unmounts.pop()!();
    expect(await renderFields(["DELIVERIES"], "MASTER")).toContain(
      "Revisão a cada (meses) *",
    );
  });

  it("sends the required interval defaults on create when the fields are hidden", () => {
    const values = {
      ...EMPTY_FORM,
      maintenance_interval_km: "",
      maintenance_interval_months: "",
      manufacturing_year: "2024",
    };
    const relations = {
      branchId: "b",
      driverId: "",
      vehicleTypeId: "t",
      fuelTypeId: "f",
    };

    const hidden = vehicleCreatePayload(values, relations, {
      withMaintenance: false,
    });
    expect(hidden.maintenance_interval_km).toBe("10000");
    expect(hidden.maintenance_interval_months).toBe("12");
    expect(hidden.manufacturing_year).toBe("2024-01-01");

    // The create action's own schema (same rules as the API's) accepts a
    // deliveries-only create with the revision fields never shown.
    const filled = vehicleCreatePayload(
      {
        ...EMPTY_FORM,
        description: "Caminhão baú 01",
        license_plate: "ABC1D23",
        brand: "Volvo",
        model: "FH 540",
        acquisition_date: "2024-03-10",
        fleet_type: "OWNED",
        renavam: "12345678901",
        manufacturing_year: "2024",
        model_year: "2025",
        current_mileage: "1200",
        km_per_liter: "2.5",
        number_of_axles: "3",
        status: "ACTIVE",
      },
      {
        branchId: "018f0000-0000-7000-8000-00000000000c",
        driverId: "",
        vehicleTypeId: "018f0000-0000-7000-8000-00000000000d",
        fuelTypeId: "018f0000-0000-7000-8000-00000000000e",
      },
      { withMaintenance: false },
    );
    const parsed = createVehicleSchema.safeParse(filled);
    expect(
      parsed.success
        ? []
        : parsed.error.issues.map((issue) => issue.path.join(".")),
    ).toEqual([]);

    const shown = vehicleCreatePayload(
      { ...values, maintenance_interval_km: "15000" },
      relations,
      { withMaintenance: true },
    );
    expect(shown.maintenance_interval_km).toBe("15000");
  });
});

describe("vehicle table by module", () => {
  const titles = (withMaintenance: boolean) =>
    buildVehicleColumns("b", { withMaintenance }).map(
      (column) => (column.meta as { title?: string } | undefined)?.title,
    );

  // Red before: "Última revisão" and "Km da última revisão" were columns of
  // a deliveries-only company's vehicle table.
  it("drops the revision columns without the fleet module", () => {
    const hidden = titles(
      showsMaintenanceFields({
        role: "BUSINESS_ADMIN",
        enabledModules: ["DELIVERIES"],
      }),
    );

    expect(hidden).toContain("Quilometragem atual");
    expect(hidden.join(" ")).not.toMatch(/revisão/i);
    expect(titles(true)).toEqual(
      expect.arrayContaining(["Última revisão", "Km da última revisão"]),
    );
  });
});

describe("driver vehicle card by module", () => {
  // Red before: a driver of a deliveries-only company read "Última
  // Manutenção" and an interval that is only a stored default.
  it("shows no maintenance block without the fleet module", async () => {
    useAuthStore.setState({
      role: "BUSINESS_USER",
      enabledModules: ["DELIVERIES"],
    });
    const text = await render(createElement(DriverVehiclesList));

    expect(text).toContain("ABC1D23");
    expect(text).not.toMatch(/Manutenção|Intervalo/);
  });

  it("keeps the maintenance block with the fleet module", async () => {
    useAuthStore.setState({ role: "BUSINESS_USER", enabledModules: ["FLEET"] });
    const text = await render(createElement(DriverVehiclesList));

    expect(text).toContain("Última Manutenção");
  });
});

describe("vehicle stats by module", () => {
  const META = {
    total: 10,
    statusCounts: { ACTIVE: 6, IN_ROUTE: 0, INACTIVE: 2, BLOCKED: 2 },
  };

  // Red before: "Em Rota / Com rota em andamento" showed to a fleet-only
  // company, always 0 (only a Route writes IN_ROUTE).
  it("hides the in-route card from a fleet-only company", async () => {
    session("BUSINESS_ADMIN", ["FLEET"]);
    const text = await render(
      createElement(VehicleStats, { searchMeta: META as never, total: 10 }),
    );

    expect(text).toContain("Veículos Ativos");
    expect(text).not.toMatch(/Em Rota|rota em andamento/);
  });

  it("keeps the in-route card with Entregas", async () => {
    session("BUSINESS_ADMIN", ["DELIVERIES"]);
    const text = await render(
      createElement(VehicleStats, { searchMeta: META as never, total: 10 }),
    );

    expect(text).toContain("Em Rota");
  });
});

describe("shared page copy names neither module", () => {
  const read = (file: string) =>
    readFileSync(path.resolve(__dirname, "../../src", file), "utf8");

  // Red before: these strings named abastecimentos, revisões, OS and
  // "Supervisor de Frota" on pages every company opens.
  it("keeps the shared subtitles and examples neutral", () => {
    const copies = [
      read("app/(protected)/dashboard/fuel-type/page.tsx"),
      read("app/(protected)/dashboard/fuel-type/loading.tsx"),
      read("app/(protected)/dashboard/vehicle/page.tsx"),
      read("app/(protected)/dashboard/vehicle/loading.tsx"),
    ];

    for (const source of copies) {
      const descriptions = source.match(/description[=:]\s*"[^"]*"/g) ?? [];
      expect(descriptions.length).toBeGreaterThan(0);
      for (const text of descriptions) {
        expect(text).not.toMatch(/abastec|revis|ordens? de servi|entrega/i);
      }
    }

    expect(
      read("app/(protected)/_components/kanban/card/card-modal/index.tsx"),
    ).not.toContain("Ordem de serviço do veículo");
    expect(read("features/profile-access/form-dialog/index.tsx")).not.toContain(
      "Supervisor de Frota",
    );
  });
});
