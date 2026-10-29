import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

// Only Next's bundled react-dom has the form hooks; this runner's does not.
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();

  return { ...actual, useFormStatus: () => ({ pending: false }) };
});

// The map is a Leaflet widget loaded on the client; nothing here reads it.
vi.mock("next/dynamic", () => ({ default: () => () => null }));

// The vehicle as the API answers it now: the odometer moved past the order,
// whose reading is still the vehicle's last maintenance.
const vehicleNow = vi.hoisted(() => ({
  current_mileage: 50_000,
  last_maintenance_mileage: 45_000,
}));

vi.mock(
  "@/app/(protected)/_components/shared/searches/search-vehicle-by-id-business",
  () => ({
    useFetchVehicleData: () => ({ data: vehicleNow, isLoading: false }),
  }),
);

import { UpdateServiceOrderFormSubmit } from "@/features/service-order/update-form/submit";
import { editMileageState } from "@/features/service-order/lib/service-order-rules";
import type { ServiceOrderRow } from "@/features/service-order/server-table";

/**
 * Editing a finished service order after the odometer moved on.
 *
 * A correction of its reading is judged against the order's own opening
 * reading, not the odometer of today, which moved on after the order.
 *
 * The form preloads the stored reading (45 000 km) and judged it against the
 * vehicle's odometer (50 000 km after the next fuel-up): the field went red
 * and Save stayed disabled even for a change of description. The delete
 * guard refuses a finished order and says to edit it instead, so the order
 * could be neither corrected nor removed.
 */
(globalThis as { React?: typeof React }).React = React;

const FINISHED: ServiceOrderRow = {
  id: "018f0000-0000-7000-8000-000000000001",
  date: "2026-09-20T12:00:00.000Z",
  completion_date: "2026-09-21T12:00:00.000Z",
  maintenance_type: "EXTERNAL",
  total_amount: 500,
  description: "Troca de pastilhas",
  current_mileage_at_service: 44_000,
  maintenance_interval_km_at_service: 10_000,
  last_maintenance_mileage_at_service: 34_000,
  new_mileage_after_service: 45_000,
  businessId: "018f0000-0000-7000-8000-00000000000b",
  vehicleId: "018f0000-0000-7000-8000-0000000000e1",
  responsibleUserId: "u1",
  branchId: "b1",
  supplierId: null,
  latitude: null,
  longitude: null,
  created_from: "WEB_DASHBOARD",
  created_at: "2026-09-20T12:00:00.000Z",
  updated_at: "2026-09-21T12:00:00.000Z",
  parts_total: 0,
  parts_count: 0,
  accounts_payable_count: 0,
};

let root: Root | null = null;

async function mount(order: ServiceOrderRow, edited: Record<string, string>) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(
      createElement(
        "form",
        null,
        createElement(UpdateServiceOrderFormSubmit, {
          state: {},
          serviceOrder: order,
          businessId: order.businessId,
          vehicleId: order.vehicleId,
          canEditSnapshot: false,
          isEntityDirty: false,
          onBack: () => {},
          latitude: null,
          longitude: null,
          isLoadingLocation: false,
          handleLocationChange: () => {},
          handleLocationLoadingChange: () => {},
          // What the user typed, kept as if coming back from a step.
          initialFormValues: edited,
          onFormValuesChange: () => {},
        }),
      ),
    );
  });

  return host;
}

const save = (host: HTMLElement) =>
  host.querySelector<HTMLButtonElement>('button[type="submit"]')!;

/**
 * Submits like the browser does; false when the live validation stopped it
 * (decision 16.700: Save stays enabled once something changed, and an
 * invalid reading is explained on submit instead of disabling the button).
 */
async function submit(host: HTMLElement): Promise<boolean> {
  let passed = true;

  await act(async () => {
    passed = host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

  return passed;
}

const mileageError = () =>
  document.getElementById("new_mileage_after_service-error")?.textContent ?? "";

afterEach(async () => {
  vehicleNow.last_maintenance_mileage = 45_000;
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("the edit form of a finished order, the odometer past its reading", () => {
  it("saves a change of description with the stored reading untouched", async () => {
    const host = await mount(FINISHED, {
      description: "Troca de pastilhas e discos",
    });

    expect(save(host).disabled).toBe(false);
    expect(host.textContent).not.toContain("não pode ser menor");
  });

  it("accepts a correction behind the odometer, judged against the opening reading", async () => {
    // Judged against the odometer (50 000), this honest correction kept Save
    // disabled: only a false reading above it could be saved.
    const host = await mount(FINISHED, { new_mileage_after_service: "45500" });

    expect(save(host).disabled).toBe(false);
    expect(host.textContent).toContain(
      "Correção válida: a quilometragem atual do veículo não muda",
    );
    expect(
      host.querySelector<HTMLInputElement>("#new_mileage_after_service")
        ?.placeholder,
    ).toBe("Igual ou maior que 44000 km (na abertura da ordem)");
  });

  it("refuses a correction behind the order's opening reading on submit", async () => {
    const host = await mount(FINISHED, { new_mileage_after_service: "43000" });

    expect(await submit(host)).toBe(false);
    expect(mileageError()).toContain("não pode ser menor que 44.000 km");
    expect(mileageError()).toContain("abertura da ordem");
  });

  it("refuses passing the odometer on submit once a later maintenance was recorded", async () => {
    vehicleNow.last_maintenance_mileage = 48_000;

    const host = await mount(FINISHED, { new_mileage_after_service: "51000" });

    expect(await submit(host)).toBe(false);
    expect(mileageError()).toContain(
      "manutenção registrada depois desta ordem",
    );
  });

  it("still judges the reading of an order being finished now", async () => {
    const open = {
      ...FINISHED,
      completion_date: null,
      new_mileage_after_service: null,
    };
    const host = await mount(open, {
      completion_date: "2026-09-22T12:00:00.000Z",
      new_mileage_after_service: "45000",
    });

    expect(await submit(host)).toBe(false);
    expect(mileageError()).toContain(
      "não pode ser menor que 50.000 km (atual do veículo)",
    );
    expect(document.activeElement?.id).toBe("new_mileage_after_service");
  });
});

describe("editMileageState, the rule the form and the API share", () => {
  const base = {
    stored: "45000",
    wasCompleted: true,
    isCompleted: true,
    sameVehicle: true,
    currentMileage: 50_000,
    openingMileage: 44_000,
    // The vehicle's last maintenance is this order's.
    vehicleLastMaintenanceMileage: 45_000 as number | null | undefined,
  };

  it("leaves the stored reading of a finished order unjudged", () => {
    expect(editMileageState({ ...base, typed: "45000" })).toMatchObject({
      isRecordedNow: false,
      refusal: null,
      isValid: true,
    });
    // The same number written another way is the same reading.
    expect(editMileageState({ ...base, typed: "45000,0" }).isRecordedNow).toBe(
      false,
    );
  });

  it("judges a correction against the opening reading, not the odometer", () => {
    expect(editMileageState({ ...base, typed: "46000" })).toMatchObject({
      isRecordedNow: true,
      isCorrection: true,
      floor: 44_000,
      refusal: null,
      isValid: true,
    });
    expect(editMileageState({ ...base, typed: "44000" }).isValid).toBe(true);
    expect(editMileageState({ ...base, typed: "43999" })).toMatchObject({
      refusal: "behind-opening",
      isValid: false,
    });
    expect(editMileageState({ ...base, typed: "51000" }).isValid).toBe(true);
    // A legacy order without an opening reading has no floor but zero.
    expect(
      editMileageState({ ...base, openingMileage: null, typed: "1000" })
        .isValid,
    ).toBe(true);
  });

  it("refuses passing the odometer only when a later maintenance was recorded", () => {
    const later = { ...base, vehicleLastMaintenanceMileage: 48_000 };

    expect(editMileageState({ ...later, typed: "51000" })).toMatchObject({
      refusal: "ahead-of-later-maintenance",
      isValid: false,
    });
    expect(editMileageState({ ...later, typed: "47000" }).isValid).toBe(true);
    // Not loaded yet: the API decides.
    expect(
      editMileageState({
        ...base,
        vehicleLastMaintenanceMileage: undefined,
        typed: "51000",
      }).isValid,
    ).toBe(true);
  });

  it("judges the reading against the new vehicle's odometer once the order moves", () => {
    expect(
      editMileageState({ ...base, typed: "45000", sameVehicle: false }),
    ).toMatchObject({
      isCorrection: false,
      refusal: "behind-odometer",
      isValid: false,
    });
  });

  it("judges an order being finished now, and requires the reading", () => {
    const finishing = { ...base, stored: "", wasCompleted: false };

    expect(editMileageState({ ...finishing, typed: "49999" }).isValid).toBe(
      false,
    );
    expect(editMileageState({ ...finishing, typed: "50000" }).isValid).toBe(
      true,
    );
    expect(editMileageState({ ...finishing, typed: "" }).isValid).toBe(false);
  });

  it("asks nothing of an open order", () => {
    expect(
      editMileageState({
        ...base,
        stored: "",
        wasCompleted: false,
        isCompleted: false,
        typed: "",
      }),
    ).toMatchObject({ isRecordedNow: false, refusal: null, isValid: true });
  });
});
