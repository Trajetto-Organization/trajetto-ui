"use client";

import { useCallback, useState } from "react";

import type {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandFuelTypeInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/shared/common.types";

/**
 * The four choices a refueling is made of — branch, vehicle and driver, fuel
 * type — as the steps of one wizard, shared by create and edit.
 *
 * The company is not a step: /admin takes it from the selector at the top of
 * the page and /dashboard from the session (decision 8.7). The admin copy
 * asked for a company inside the dialog, apart from the one the page showed.
 */
type FuelWizardStep =
  "select-branch" | "select-vehicle-driver" | "select-fuel-type" | "form";

interface FuelWizardSelection {
  branch: CommandBranchInputValue;
  vehicle: CommandVehicleInputValue;
  driver: CommandDriverInputValue;
  fuelType: CommandFuelTypeInputValue;
}

const EMPTY_SELECTION: FuelWizardSelection = {
  branch: { branchId: "", searchBranchInputValue: "" },
  vehicle: {
    vehicleId: "",
    searchVehicleInputValue: "",
    vehicleLicensePlate: "",
  },
  driver: { driverId: "", searchDriverInputValue: "", driverCnh: "" },
  fuelType: { fuelTypeId: "", searchFuelTypeInputValue: "" },
};

/** Picking the selected option again clears it (the pickers' toggle). */
function toggle<T extends object>(
  current: T,
  next: T,
  idKey: keyof T,
  empty: T,
): T {
  return next[idKey] === current[idKey] ? empty : next;
}

function useFuelWizard(initial: FuelWizardSelection = EMPTY_SELECTION) {
  const [step, setStep] = useState<FuelWizardStep>("select-branch");
  const [selection, setSelection] = useState<FuelWizardSelection>(initial);

  const reset = useCallback(
    (to: FuelWizardSelection = initial) => {
      setStep("select-branch");
      setSelection(to);
    },
    [initial],
  );

  return {
    step,
    selection,
    goTo: setStep,
    reset,
    selectBranch: (value: CommandBranchInputValue) =>
      setSelection((current) => ({
        ...current,
        branch: toggle(
          current.branch,
          value,
          "branchId",
          EMPTY_SELECTION.branch,
        ),
      })),
    selectVehicle: (value: CommandVehicleInputValue) =>
      setSelection((current) => ({
        ...current,
        vehicle: toggle(
          current.vehicle,
          value,
          "vehicleId",
          EMPTY_SELECTION.vehicle,
        ),
      })),
    selectDriver: (value: CommandDriverInputValue) =>
      setSelection((current) => ({
        ...current,
        driver: toggle(
          current.driver,
          value,
          "driverId",
          EMPTY_SELECTION.driver,
        ),
      })),
    selectFuelType: (value: CommandFuelTypeInputValue) =>
      setSelection((current) => ({
        ...current,
        fuelType: toggle(
          current.fuelType,
          value,
          "fuelTypeId",
          EMPTY_SELECTION.fuelType,
        ),
      })),
  };
}

/** Title and description of each step, the same words in both dialogs. */
function wizardHeading(
  step: FuelWizardStep,
  mode: "create" | "update",
): { title: string; description: string } {
  switch (step) {
    case "select-branch":
      return {
        title: "Selecionar Filial",
        description:
          mode === "create"
            ? "Selecione a filial do abastecimento."
            : "Confirme ou troque a filial do abastecimento.",
      };
    case "select-vehicle-driver":
      return {
        title: "Selecionar Veículo e Motorista",
        description: "Selecione o veículo e o motorista do abastecimento.",
      };
    case "select-fuel-type":
      return {
        title: "Selecionar Tipo de Combustível",
        description: "Selecione o tipo de combustível.",
      };
    default:
      return mode === "create"
        ? {
            title: "Criar Abastecimento",
            description: "Informe os dados do abastecimento.",
          }
        : {
            title: "Editar Abastecimento",
            description: "Altere o que precisar e salve.",
          };
  }
}

export {
  EMPTY_SELECTION,
  useFuelWizard,
  wizardHeading,
  type FuelWizardSelection,
  type FuelWizardStep,
};
