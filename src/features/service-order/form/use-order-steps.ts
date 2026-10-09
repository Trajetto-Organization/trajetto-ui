"use client";

import { useCallback, useState } from "react";

import type {
  CommandBranchInputValue,
  CommandSupplierInputValue,
  CommandUserInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/shared/common.types";

/**
 * The steps before a service order's own fields: branch, vehicle and
 * supplier, responsible user. The create and edit dialogs of /admin and
 * /dashboard each kept four copies of this state (decision 8.7).
 */
type OrderStep =
  "select-branch" | "select-vehicle-supplier" | "select-user" | "form";

interface OrderPicks {
  branch: CommandBranchInputValue;
  vehicle: CommandVehicleInputValue;
  supplier: CommandSupplierInputValue;
  user: CommandUserInputValue;
}

const EMPTY_PICKS: OrderPicks = {
  branch: { branchId: "", searchBranchInputValue: "" },
  vehicle: {
    vehicleId: "",
    searchVehicleInputValue: "",
    vehicleLicensePlate: "",
  },
  supplier: { supplierId: "", searchSupplierInputValue: "" },
  user: { userId: "", searchUserInputValue: "", responsibleUserEmail: "" },
};

function useOrderSteps(initial: OrderPicks = EMPTY_PICKS) {
  const [step, setStep] = useState<OrderStep>("select-branch");
  const [picks, setPicks] = useState<OrderPicks>(initial);

  // The fields of the last step, kept when going back a step.
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  /** Picking the selected option again clears it. */
  const toggle = useCallback(
    <K extends keyof OrderPicks>(
      key: K,
      idOf: (value: OrderPicks[K]) => string,
    ) =>
      (value: OrderPicks[K]) =>
        setPicks((current) => ({
          ...current,
          [key]:
            idOf(value) && idOf(value) === idOf(current[key])
              ? EMPTY_PICKS[key]
              : value,
        })),
    [],
  );

  const reset = useCallback(
    (to: OrderPicks = initial) => {
      setStep("select-branch");
      setPicks(to);
      setFormValues({});
    },
    [initial],
  );

  return {
    step,
    picks,
    formValues,
    setFormValues,
    reset,
    goTo: setStep,
    pickBranch: toggle("branch", (value) => value.branchId),
    pickVehicle: toggle("vehicle", (value) => value.vehicleId),
    pickSupplier: toggle("supplier", (value) => value.supplierId),
    pickUser: toggle("user", (value) => value.userId),
  };
}

/** Titles and descriptions of each step, the same in create and edit. */
function stepCopy(
  step: OrderStep,
  verb: "create" | "update",
): { title: string; description: string } {
  switch (step) {
    case "select-branch":
      return {
        title: "Selecionar Filial",
        description:
          verb === "create"
            ? "Selecione a filial da ordem de serviço."
            : "Confira ou troque a filial da ordem de serviço.",
      };
    case "select-vehicle-supplier":
      return {
        title: "Selecionar Veículo e Fornecedor",
        description:
          "Selecione o veículo (obrigatório) e, se houver, o fornecedor.",
      };
    case "select-user":
      return {
        title: "Selecionar Usuário Responsável",
        description: "Selecione o usuário responsável pela ordem de serviço.",
      };
    default:
      return verb === "create"
        ? {
            title: "Criar Ordem de Serviço",
            description:
              "Preencha os dados abaixo para criar a ordem de serviço.",
          }
        : {
            title: "Editar Ordem de Serviço",
            description: "Atualize os dados abaixo e salve as alterações.",
          };
  }
}

export {
  EMPTY_PICKS,
  stepCopy,
  useOrderSteps,
  type OrderPicks,
  type OrderStep,
};
