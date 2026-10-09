import * as React from "react";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

// What the person reads: the toasts, recorded.
const toasts = vi.hoisted(() => ({
  success: [] as string[],
  error: [] as string[],
}));

vi.mock("sonner", () => ({
  toast: {
    success: (message: string) => toasts.success.push(message),
    error: (message: string) => toasts.error.push(message),
  },
}));

// The Radix menu needs pointer events happy-dom does not have; the items and
// what selecting one does are what is proven, so they render flat.
vi.mock("@/components/shared/custom/row-actions", () => ({
  RowActions: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  RowActionSeparator: () => null,
  RowActionItem: ({
    label,
    onSelect,
  }: {
    label: string;
    onSelect: () => void;
  }) =>
    createElement("button", { "data-label": label, onClick: onSelect }, label),
}));

// Dialogs that only open on select, backed by Server Actions.
vi.mock("@/features/fuel/update-dialog", () => ({
  UpdateFuelDialog: () => null,
}));
vi.mock("@/features/fuel/delete-dialog", () => ({
  DeleteFuelDialog: () => null,
}));
vi.mock("@/app/(protected)/_components/shared/fuel-details-dialog", () => ({
  FuelDetailsDialog: () => null,
}));
vi.mock("@/features/fuel-type/form-dialog", () => ({
  FuelTypeFormDialog: () => null,
}));
vi.mock("@/features/fuel-type/delete-dialog", () => ({
  DeleteFuelTypeDialog: () => null,
}));

import {
  COPY_FAILED,
  copyWithFeedback,
  type CopyDeps,
} from "@/features/fuel/lib/copy";
import { FuelRowActions } from "@/features/fuel/table/row-actions";
import { FuelTypeRowActions } from "@/features/fuel-type/table/row-actions";
import { useAuthStore } from "@/store/auth-store";

(globalThis as { React?: typeof React }).React = React;

/**
 * The row menus' "Copiar ID…" (fuel and fuel type).
 *
 * They showed `"Erro ao copiar o ID: " + error`: the browser's raw English
 * DOMException in a Portuguese toast, and "o ID" for every kind of id.
 */
function recorder(write: CopyDeps["writeText"]) {
  const said = {
    success: [] as string[],
    error: [] as string[],
    logged: [] as unknown[],
  };

  const deps: CopyDeps = {
    writeText: write,
    success: (message) => said.success.push(message),
    error: (message) => said.error.push(message),
    log: (_message, error) => said.logged.push(error),
  };

  return { said, deps };
}

describe("copyWithFeedback", () => {
  it("names what was copied", async () => {
    const copied: string[] = [];
    const { said, deps } = recorder(async (value) => {
      copied.push(value);
    });

    expect(await copyWithFeedback("018f-filial", "ID da filial", deps)).toBe(
      true,
    );
    expect(copied).toEqual(["018f-filial"]);
    expect(said.success).toEqual([
      "ID da filial copiado para a área de transferência!",
    ]);
    expect(said.error).toEqual([]);
  });

  it("says a fixed Portuguese sentence on failure and logs the browser's error", async () => {
    const denied = new DOMException(
      "Write permission denied.",
      "NotAllowedError",
    );
    const { said, deps } = recorder(async () => {
      throw denied;
    });

    expect(await copyWithFeedback("018f-veiculo", "ID do veículo", deps)).toBe(
      false,
    );
    expect(said.error).toEqual([COPY_FAILED]);
    expect(said.error[0]).not.toContain("NotAllowedError");
    expect(said.error[0]).not.toContain("permission");
    expect(said.logged).toEqual([denied]);
    expect(said.success).toEqual([]);
  });
});

describe("the fuel and fuel type row menus", () => {
  const FUEL = {
    id: "018f0000-0000-7000-8000-0000000000f1",
    businessId: "018f0000-0000-7000-8000-00000000000a",
    branchId: "018f0000-0000-7000-8000-0000000000b1",
    vehicleId: "018f0000-0000-7000-8000-0000000000c1",
    driverId: "018f0000-0000-7000-8000-0000000000d1",
    fuelTypeId: "018f0000-0000-7000-8000-0000000000e1",
    refueling_date: "2026-09-12T15:00:00.000Z",
    vehicle: { license_plate: "ABC1D23" },
  };

  const FUEL_TYPE = {
    id: "018f0000-0000-7000-8000-0000000000e1",
    businessId: FUEL.businessId,
    description: "Diesel S10",
  };

  let root: Root | null = null;
  let host: HTMLElement;
  const written: string[] = [];

  function clipboard(write: (value: string) => Promise<void>): void {
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: write },
    });
  }

  async function render(element: React.ReactElement): Promise<void> {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => root!.render(element));
  }

  async function select(label: string): Promise<void> {
    const item = host.querySelector(
      `[data-label="${label}"]`,
    ) as HTMLButtonElement;

    await act(async () => item.click());
    // The copy is awaited inside the handler; let it settle.
    await act(async () => {
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    toasts.success.length = 0;
    toasts.error.length = 0;
    written.length = 0;
    vi.spyOn(console, "warn").mockImplementation(() => {});

    useAuthStore.setState({
      role: "BUSINESS_ADMIN",
      isLoaded: true,
      businessId: FUEL.businessId,
      permissions: [],
    } as never);
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("copy each id with a sentence that names it", async () => {
    clipboard(async (value) => {
      written.push(value);
    });

    await render(
      createElement(FuelRowActions, { row: { original: FUEL } as never }),
    );
    await select("Copiar ID do veículo");

    expect(written).toEqual([FUEL.vehicleId]);
    expect(toasts.success).toEqual([
      "ID do veículo copiado para a área de transferência!",
    ]);
  });

  it("say a fixed Portuguese sentence when the browser refuses, never its error", async () => {
    // Red before: both menus showed "Erro ao copiar o ID: NotAllowedError: …".
    clipboard(async () => {
      throw new DOMException("Write permission denied.", "NotAllowedError");
    });

    await render(
      createElement(FuelRowActions, { row: { original: FUEL } as never }),
    );
    await select("Copiar ID");

    await act(async () => root?.unmount());
    root = null;

    await render(
      createElement(FuelTypeRowActions, {
        row: { original: FUEL_TYPE } as never,
      }),
    );
    await select("Copiar ID");

    expect(toasts.error).toEqual([COPY_FAILED, COPY_FAILED]);
    expect(toasts.error.join(" ")).not.toContain("NotAllowedError");
    expect(toasts.error.join(" ")).not.toContain("Erro ao copiar");
  });
});
