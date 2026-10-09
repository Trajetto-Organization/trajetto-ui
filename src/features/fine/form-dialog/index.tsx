"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import type {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandTrafficViolationCodeInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/shared/common.types";
import type { TrafficViolationCodeChoice } from "@/app/(protected)/_components/shared/searches/search-traffic-violation-code/search-traffic-violation-code.types";

import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";
import { SelectVehicleDriverStep } from "@/app/(protected)/_components/shared/steps/select-vehicle-driver-step";
import { SelectViolationCodeStep } from "@/app/(protected)/_components/shared/steps/select-violation-code-step";

import { handleCreateFine } from "@/actions/fine/create-fine";
import { handleUpdateFine } from "@/actions/fine/update-fine";
import { revalidateTags } from "@/actions/revalidate";

import {
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";
import { guardFormAction } from "@/lib/action-result";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";

import {
  fineFormFields,
  initialFineFormState,
  isFineFormDirty,
  pointsAfterCodePick,
  type FineFormState,
} from "../lib/form-state";
import {
  fineDateIssues,
  fineFieldsSchema,
  liveTodayKey,
} from "../lib/fine-form-schema";
import type { FineRow } from "../lib/types";

import { FineDetailsStep, type FieldErrors } from "./details";

type Step = "branch" | "vehicle-driver" | "violation-code" | "details";

/** The fields of the last step, in its order: what its submit checks. */
const DETAIL_FIELDS = [
  "violation_date",
  "due_date",
  "payment_date",
  "amount",
  "points",
  "location",
  "observation",
] as const;

const DETAIL_CONTROL_IDS = {
  violation_date: "fine-violation-date",
  due_date: "fine-due-date",
  payment_date: "fine-payment-date",
  amount: "fine-amount",
  points: "fine-points",
  location: "fine-location",
  observation: "fine-observation",
};

const STEP_COPY: Record<
  Step,
  { title: [string, string]; description: [string, string] }
> = {
  branch: {
    title: ["Selecionar Filial", "Selecionar Filial"],
    description: [
      "Selecione a filial da multa.",
      "Troque a filial, se necessário.",
    ],
  },
  "vehicle-driver": {
    title: ["Selecionar Veículo e Motorista", "Selecionar Veículo e Motorista"],
    description: [
      "Selecione o veículo e o motorista envolvidos na infração.",
      "Troque o veículo ou o motorista, se necessário.",
    ],
  },
  "violation-code": {
    title: ["Selecionar Código de Infração", "Selecionar Código de Infração"],
    description: [
      "Busque pelo código impresso na notificação ou por palavras da descrição.",
      "Troque o código de infração, se necessário.",
    ],
  },
  details: {
    title: ["Registrar Multa", "Editar Multa"],
    description: [
      "Informe as datas, o valor e os pontos para concluir o cadastro.",
      "Atualize as informações da multa.",
    ],
  },
};

interface ActionState {
  successMessage?: string;
  createFineError?: FieldErrors & { createFineErrorMessage?: string };
  updateFineError?: FieldErrors & { updateFineErrorMessage?: string };
}

interface FineFormDialogProps {
  /** The fine's company: the selected one on /admin, the session's on /dashboard. */
  businessId: string;
  /** Present when editing. */
  fine?: FineRow;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Registering or editing a fine: one dialog for /admin and /dashboard, where
 * four copies used to live (create and edit in each tree), each with its
 * own step machine and dirty check. The steps are the ones the guided tour
 * describes: branch, vehicle and driver, the infraction code, the details.
 *
 * The /admin copy asked for the company in its first step; the company is
 * the one picked above the table now, the same the list shows.
 */
const FineFormDialog = ({
  businessId,
  fine,
  isOpen,
  onClose,
}: FineFormDialogProps): JSX.Element => {
  const isEdit = Boolean(fine);
  const copyIndex = isEdit ? 1 : 0;

  const [step, setStep] = useState<Step>("branch");
  const [form, setForm] = useState<FineFormState>(() =>
    initialFineFormState(fine),
  );

  // The points the last picked code suggested, so a new pick can replace
  // them without overwriting what the person typed.
  const suggestedPoints = useRef<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  const [branch, setBranch] = useState<CommandBranchInputValue>({
    branchId: fine?.branchId ?? "",
    searchBranchInputValue: fine?.branch.corporate_reason ?? "",
  });

  const [vehicle, setVehicle] = useState<CommandVehicleInputValue>({
    vehicleId: fine?.vehicleId ?? "",
    searchVehicleInputValue: fine?.vehicle.description ?? "",
    vehicleLicensePlate: fine?.vehicle.license_plate ?? "",
  });

  // The row carries the driver's CPF, not the CNH: the chip shows no
  // licence digits rather than the CPF's under a "CNH" label.
  const [driver, setDriver] = useState<CommandDriverInputValue>({
    driverId: fine?.driverId ?? "",
    searchDriverInputValue: fine?.driver.name ?? "",
    driverCnh: "",
  });

  const [code, setCode] = useState<CommandTrafficViolationCodeInputValue>(
    () => {
      if (!fine) {
        return {
          trafficViolationCodeId: "",
          searchTrafficViolationCodeInputValue: "",
        };
      }

      const printed = `${fine.trafficViolationCode.code}-${fine.trafficViolationCode.sub_code}`;

      return {
        trafficViolationCodeId: fine.trafficViolationCodeId,
        searchTrafficViolationCodeInputValue: `${printed} - ${fine.trafficViolationCode.description}`,
        violationCode: printed,
      };
    },
  );

  const [createState, createDispatch] = useFormState<ActionState, FormData>(
    guardFormAction(handleCreateFine),
    {},
  );
  const [updateState, updateDispatch] = useFormState<ActionState, FormData>(
    guardFormAction(handleUpdateFine),
    {},
  );

  const actionState = isEdit ? updateState : createState;

  // Saving the same form again is the same fine (IDEMP-14).
  const idempotencyKeyFor = useIdempotencyKey(createState);

  const errors: FieldErrors = useMemo(() => {
    const { createFineErrorMessage: _c, ...createErrors } =
      createState.createFineError ?? {};
    const { updateFineErrorMessage: _u, ...updateErrors } =
      updateState.updateFineError ?? {};

    return isEdit ? updateErrors : createErrors;
  }, [createState, updateState, isEdit]);

  const isDirty = fine ? isFineFormDirty(fine, form) : true;

  // Live validation of the details (decision 16.700): the action's field
  // rules, and the date rules without waiting for the amount or points.
  const live = useLiveValidation({
    schema: fineFieldsSchema,
    values: fineFormFields(form, businessId),
    rules: (values) => ({ ...fineDateIssues(values, liveTodayKey()) }),
    fields: DETAIL_FIELDS,
    serverErrors: errors,
    controlIds: DETAIL_CONTROL_IDS,
  });

  const detailErrors: FieldErrors = {
    ...errors,
    ...Object.fromEntries(
      DETAIL_FIELDS.map((field) => [field, live.errorOf(field)]),
    ),
  };

  // One toast per answer, however many renders it takes to close.
  const handled = useRef<ActionState | null>(null);

  useEffect(() => {
    if (handled.current === actionState) return;
    handled.current = actionState;

    const message =
      actionState.createFineError?.createFineErrorMessage ??
      actionState.updateFineError?.updateFineErrorMessage;

    if (message) {
      toast.error(message);
      return;
    }

    if (actionState.successMessage) {
      toast.success(actionState.successMessage);
      // The list and the overview's fine count both read these tags.
      void revalidateTags(["update-fine", "update-fine-count"]);
      onClose();
    }
  }, [actionState, onClose]);

  const patch = (next: Partial<FineFormState>) =>
    setForm((current) => ({ ...current, ...next }));

  // Picking the chosen option again clears it, as in every picker step.
  const chooseBranch = (value: CommandBranchInputValue) => {
    const next =
      value.branchId === branch.branchId
        ? { branchId: "", searchBranchInputValue: "" }
        : value;

    setBranch(next);
    patch({ branchId: next.branchId });
  };

  const chooseVehicle = (value: CommandVehicleInputValue) => {
    const next =
      value.vehicleId === vehicle.vehicleId
        ? {
            vehicleId: "",
            searchVehicleInputValue: "",
            vehicleLicensePlate: "",
          }
        : value;

    setVehicle(next);
    patch({ vehicleId: next.vehicleId });
  };

  const chooseDriver = (value: CommandDriverInputValue) => {
    const next =
      value.driverId === driver.driverId
        ? { driverId: "", searchDriverInputValue: "", driverCnh: "" }
        : value;

    setDriver(next);
    patch({ driverId: next.driverId });
  };

  const chooseCode = (value: TrafficViolationCodeChoice) => {
    const cleared =
      value.trafficViolationCodeId === code.trafficViolationCodeId;
    const { points, ...next } = cleared
      ? {
          trafficViolationCodeId: "",
          searchTrafficViolationCodeInputValue: "",
          violationCode: "",
          points: undefined,
        }
      : value;

    setCode(next);

    // The code's points fill the field while it is empty or still holds
    // the previous code's suggestion; a value the person typed (or the one
    // an edit loaded) is kept.
    setForm((current) => {
      const nextPoints = pointsAfterCodePick(
        current.points,
        suggestedPoints.current,
        points,
      );

      if (nextPoints !== current.points) suggestedPoints.current = nextPoints;

      return {
        ...current,
        trafficViolationCodeId: next.trafficViolationCodeId,
        points: nextPoints,
      };
    });
  };

  const submit = (formData: FormData) => {
    if (!live.isValid()) return;

    // `set`, not `append`: the inputs already posted some of these names,
    // and the state is the source of truth.
    for (const [name, value] of Object.entries(
      fineFormFields(form, businessId),
    )) {
      formData.set(name, value);
    }

    if (fine) {
      formData.set("fineId", fine.id);
      return updateDispatch(formData);
    }

    // From everything being sent: the same fine sent again keeps its key.
    formData.set("idempotency_key", idempotencyKeyFor(formData));
    return createDispatch(formData);
  };

  const copy = STEP_COPY[step];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogScrollContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{copy.title[copyIndex]}</DialogTitle>
          <DialogDescription>{copy.description[copyIndex]}</DialogDescription>
        </DialogHeader>

        {step === "branch" && (
          <SelectBranchStep
            businessId={businessId}
            commandBranchInputValue={branch}
            handleUpdateSearchBranchInputValue={chooseBranch}
            onContinue={() => setStep("vehicle-driver")}
            errorBranchId={errors.branchId}
          />
        )}

        {step === "vehicle-driver" && (
          <SelectVehicleDriverStep
            businessId={businessId}
            commandVehicleInputValue={vehicle}
            commandDriverInputValue={driver}
            handleUpdateSearchVehicleInputValue={chooseVehicle}
            handleUpdateSearchDriverInputValue={chooseDriver}
            onContinue={() => setStep("violation-code")}
            onBack={() => setStep("branch")}
            errorVehicleId={errors.vehicleId}
            errorDriverId={errors.driverId}
          />
        )}

        {step === "violation-code" && (
          <SelectViolationCodeStep
            commandTrafficViolationCodeInputValue={code}
            handleUpdateSearchTrafficViolationCodeInputValue={chooseCode}
            onContinue={() => setStep("details")}
            onBack={() => setStep("vehicle-driver")}
            errorTrafficViolationCodeId={errors.trafficViolationCodeId}
          />
        )}

        {step === "details" && (
          <form ref={live.ref} action={submit} noValidate>
            <FineDetailsStep
              isEdit={isEdit}
              state={form}
              errors={detailErrors}
              canSubmit={canSubmitForm({ isEdit, isDirty })}
              isLoadingLocation={isLoadingLocation}
              onChange={patch}
              onLoadingLocationChange={setIsLoadingLocation}
              onBack={() => setStep("violation-code")}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { FineFormDialog };
