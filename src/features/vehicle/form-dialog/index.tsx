"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import type {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandFuelTypeInputValue,
  CommandVehicleTypeInputValue,
} from "@/app/(protected)/_components/shared/common.types";

import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";
import { SelectDriverVehicleTypeStep } from "@/app/(protected)/_components/shared/steps/select-driver-vehicle-type-step";
import { SelectFuelTypeStep } from "@/app/(protected)/_components/shared/steps/select-fuel-type-step";

import { handleCreateVehicle } from "@/actions/vehicle/create-vehicle";
import { handleUpdateVehicle } from "@/actions/vehicle/update-vehicle";

import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";
import { guardFormAction } from "@/lib/action-result";
import { useAuthStore } from "@/store/auth-store";
import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";

import type { VehicleRow } from "../types";
import {
  EMPTY_FORM,
  VEHICLE_FORM_FIELDS,
  axlesAfterTypeChange,
  changedVehicleFields,
  vehicleFormRules,
  vehicleFormSchema,
  lockedMileageHint,
  showsMaintenanceFields,
  vehicleCreatePayload,
  vehicleEditPayload,
  vehicleFormValues,
  vehicleRelations,
  yearToDateString,
  type VehicleFormField,
  type VehicleFormValues,
  type VehicleRelations,
} from "../lib/form-values";

import { VehicleFields } from "./fields";

type Step = "branch" | "driver-type" | "fuel" | "fields";

/** Shown only with Gestão de Frotas (showsMaintenanceFields). */
const MAINTENANCE_FIELDS: ReadonlySet<string> = new Set([
  "last_maintenance_mileage",
  "last_maintenance_date",
  "maintenance_interval_km",
  "maintenance_interval_months",
]);

interface FormState {
  errors?: Partial<Record<string, string[]>>;
  errorMessage?: string;
  successMessage?: string;
}

interface VehicleFormDialogProps {
  /** The company the vehicle belongs to: the selected one on /admin. */
  businessId: string;
  /** Present to edit, absent to create. */
  vehicle?: VehicleRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEP_TEXT: Record<Step, { title: string; description: string }> = {
  branch: {
    title: "Filial do veículo",
    description: "Escolha a filial onde o veículo fica, se houver.",
  },
  "driver-type": {
    title: "Motorista responsável e tipo",
    description:
      "O motorista responsável (fixo) e o tipo de veículo, se houver. O tipo traz os eixos padrão.",
  },
  fuel: {
    title: "Combustível",
    description: "Escolha o combustível do veículo.",
  },
  fields: {
    title: "Dados do veículo",
    description: "Preencha os dados abaixo.",
  },
};

/** The two server actions answer with differently named keys; one shape here. */
function normalizeState(raw: unknown): FormState {
  const state = (raw ?? {}) as Record<string, unknown>;
  const error = (state.createVehicleError ?? state.updateVehicleError) as
    Record<string, unknown> | undefined;

  if (!error) {
    return { successMessage: state.successMessage as string | undefined };
  }

  const { createVehicleErrorMessage, updateVehicleErrorMessage, ...fields } =
    error;

  return {
    errors: fields as Partial<Record<string, string[]>>,
    errorMessage: (createVehicleErrorMessage ?? updateVehicleErrorMessage) as
      string | undefined,
  };
}

function toFormData(entries: Record<string, string>): FormData {
  const data = new FormData();

  for (const [key, value] of Object.entries(entries)) data.append(key, value);

  return data;
}

const SubmitButton = ({
  label,
  disabled,
}: {
  label: string;
  disabled: boolean;
}): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="flex-1 sm:flex-none"
    >
      <span>{label}</span>
      {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
    </Button>
  );
};

/**
 * Creating and editing a vehicle, the same dialog on /admin and /dashboard
 * (decision 8.7): the company comes in as a prop — the one picked in the
 * /admin selector or the session's — so there is no company step.
 *
 * The edit sends only what changed and keeps "Salvar" disabled until
 * something did (decision 2.5). Live validation (decision 16.700) on the
 * last step, with the action's own field rules; on edit only the changed
 * fields are judged, as only those are sent.
 */
const VehicleFormDialog = ({
  businessId,
  vehicle,
  open,
  onOpenChange,
}: VehicleFormDialogProps): JSX.Element => {
  const isEdit = Boolean(vehicle);
  const role = useAuthStore((store) => store.role);
  const enabledModules = useAuthStore((store) => store.enabledModules);
  const withMaintenance = showsMaintenanceFields({ role, enabledModules });
  const { revalidate } = useRevalidateScreen();

  const [step, setStep] = useState<Step>("branch");

  const initialValues = useMemo(
    () => (vehicle ? vehicleFormValues(vehicle) : EMPTY_FORM),
    [vehicle],
  );
  const initialRelations = useMemo(() => vehicleRelations(vehicle), [vehicle]);

  const [values, setValues] = useState<VehicleFormValues>(initialValues);
  const [axlesEditedByHand, setAxlesEditedByHand] = useState<boolean>(false);

  const [branch, setBranch] = useState<CommandBranchInputValue>({
    branchId: vehicle?.branchId ?? "",
    searchBranchInputValue: vehicle?.branch?.corporate_reason ?? "",
  });
  const [driver, setDriver] = useState<CommandDriverInputValue>({
    driverId: vehicle?.driverId ?? "",
    searchDriverInputValue: vehicle?.driver?.name ?? "",
    driverCnh: vehicle?.driver?.cnh ? vehicle.driver.cnh.slice(-4) : "",
  });
  const [vehicleType, setVehicleType] = useState<CommandVehicleTypeInputValue>({
    vehicleTypeId: vehicle?.vehicleTypeId ?? "",
    searchVehicleTypeInputValue: vehicle?.vehicleType?.description ?? "",
  });
  const [fuelType, setFuelType] = useState<CommandFuelTypeInputValue>({
    fuelTypeId: vehicle?.fuelTypeId ?? "",
    searchFuelTypeInputValue: vehicle?.fuelType?.description ?? "",
  });

  const relations: VehicleRelations = {
    branchId: branch.branchId,
    driverId: driver.driverId,
    vehicleTypeId: vehicleType.vehicleTypeId,
    fuelTypeId: fuelType.fuelTypeId,
  };

  const editPayload = vehicle
    ? vehicleEditPayload(
        { values: initialValues, relations: initialRelations },
        { values, relations },
      )
    : {};

  // The years travel as 1 January of the picked year.
  for (const field of ["manufacturing_year", "model_year"] as const) {
    if (editPayload[field])
      editPayload[field] = yearToDateString(editPayload[field]);
  }

  const isDirty = Object.keys(editPayload).length > 0;

  const changedFields = vehicle
    ? changedVehicleFields(initialValues, values)
    : null;
  const checkedFields = VEHICLE_FORM_FIELDS.filter(
    (field) =>
      (withMaintenance || !MAINTENANCE_FIELDS.has(field)) &&
      (!changedFields || changedFields.includes(field)),
  );

  // One action shape for both server actions: the state is read through
  // normalizeState, which knows either answer.
  const [rawState, dispatch] = useFormState<unknown, FormData>(
    guardFormAction((previous: unknown, data: FormData): Promise<unknown> =>
      (isEdit ? handleUpdateVehicle : handleCreateVehicle)(previous, data),
    ),
    {},
  );
  // Memoized: live validation resets its server-error snapshot whenever the
  // errors object changes, so a fresh one per render would never let a
  // server message clear on edit.
  const state = useMemo(() => normalizeState(rawState), [rawState]);

  // A pair's message sits on one field (the model year, the revision
  // mileage) even when the other one changed: a submit checks it too.
  const pairIssues = vehicleFormRules(values, changedFields);
  const submitFields = Array.from(
    new Set<string>([...checkedFields, ...Object.keys(pairIssues)]),
  );

  const live = useLiveValidation({
    schema: vehicleFormSchema(checkedFields),
    values,
    rules: () => pairIssues,
    fields: submitFields,
    serverErrors: state.errors,
  });

  const fieldErrors: Partial<Record<string, string[]>> = Object.fromEntries(
    VEHICLE_FORM_FIELDS.map((field) => [field, live.errorOf(field)]),
  );

  const handledRef = useRef<unknown>(null);

  useEffect(() => {
    if (!rawState || handledRef.current === rawState) return;
    handledRef.current = rawState;

    if (state.errorMessage) {
      toast.error(state.errorMessage);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);
      void revalidate();
      onOpenChange(false);
    }
  }, [
    rawState,
    state.errorMessage,
    state.successMessage,
    revalidate,
    onOpenChange,
  ]);

  const handleFieldChange = (field: VehicleFormField, value: string) => {
    if (field === "number_of_axles") setAxlesEditedByHand(true);

    setValues((current) => ({ ...current, [field]: value }));
  };

  // Picking a type fills its default axles until the person types their own
  // (FLEET-VTYPE-3). The picker passes the axles along with the choice.
  const handleVehicleTypeChange = (data: CommandVehicleTypeInputValue) => {
    const next =
      data.vehicleTypeId === vehicleType.vehicleTypeId
        ? { vehicleTypeId: "", searchVehicleTypeInputValue: "" }
        : data;

    setVehicleType(next);

    const typeAxles = (
      data as CommandVehicleTypeInputValue & { numberOfAxles?: number }
    ).numberOfAxles;

    if (next.vehicleTypeId) {
      setValues((current) => ({
        ...current,
        number_of_axles: axlesAfterTypeChange({
          currentAxles: current.number_of_axles,
          typeAxles,
          axlesEditedByHand,
        }),
      }));
    }
  };

  const toggle =
    <T extends object>(
      setter: (value: T) => void,
      current: T,
      key: keyof T,
      empty: T,
    ) =>
    (data: T) =>
      setter(data[key] === current[key] ? empty : data);

  const submit = () => {
    if (!live.isValid()) return;

    const payload = isEdit
      ? { ...editPayload, vehicleId: vehicle!.id, businessId }
      : {
          ...vehicleCreatePayload(values, relations, { withMaintenance }),
          businessId,
        };

    return dispatch(toFormData(payload));
  };

  const text = STEP_TEXT[step];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogScrollContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {step === "fields"
              ? isEdit
                ? "Editar veículo"
                : "Novo veículo"
              : text.title}
          </DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>

        {step === "branch" && (
          <SelectBranchStep
            businessId={businessId}
            commandBranchInputValue={branch}
            handleUpdateSearchBranchInputValue={toggle(
              setBranch,
              branch,
              "branchId",
              {
                branchId: "",
                searchBranchInputValue: "",
              },
            )}
            onContinue={() => setStep("driver-type")}
            errorBranchId={state.errors?.branchId}
            searchBranchIsOptional
          />
        )}

        {step === "driver-type" && (
          <SelectDriverVehicleTypeStep
            businessId={businessId}
            commandDriverInputValue={driver}
            commandVehicleTypeInputValue={vehicleType}
            handleUpdateSearchDriverInputValue={toggle(
              setDriver,
              driver,
              "driverId",
              {
                driverId: "",
                searchDriverInputValue: "",
                driverCnh: "",
              },
            )}
            handleUpdateSearchVehicleTypeInputValue={handleVehicleTypeChange}
            onContinue={() => setStep("fuel")}
            onBack={() => setStep("branch")}
            errorDriverId={state.errors?.driverId}
            errorVehicleTypeId={state.errors?.vehicleTypeId}
            searchDriverIsOptional
            searchVehicleTypeIsOptional
          />
        )}

        {step === "fuel" && (
          <SelectFuelTypeStep
            businessId={businessId}
            commandFuelTypeInputValue={fuelType}
            handleUpdateSearchFuelTypeInputValue={toggle(
              setFuelType,
              fuelType,
              "fuelTypeId",
              {
                fuelTypeId: "",
                searchFuelTypeInputValue: "",
              },
            )}
            onContinue={() => setStep("fields")}
            onBack={() => setStep("driver-type")}
            errorFuelTypeId={state.errors?.fuelTypeId}
          />
        )}

        {step === "fields" && (
          <form ref={live.ref} action={submit} noValidate>
            <FormFieldsWithStatus
              values={values}
              onChange={handleFieldChange}
              errors={fieldErrors}
              persistedStatus={vehicle?.status}
              mileageLocked={isEdit && role !== "MASTER"}
              withMaintenance={withMaintenance}
              mileageHint={lockedMileageHint(
                role === "MASTER" ? null : enabledModules,
              )}
            />

            <DialogFormFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => setStep("fuel")}
                {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
              >
                Voltar
              </Button>
              <SubmitButton
                label={isEdit ? "Salvar alterações" : "Criar veículo"}
                disabled={!canSubmitForm({ isEdit, isDirty })}
              />
            </DialogFormFooter>
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

/** The fields, disabled while the action runs. */
const FormFieldsWithStatus = (
  props: Omit<React.ComponentProps<typeof VehicleFields>, "disabled">,
): JSX.Element => {
  const { pending } = useFormStatus();

  return <VehicleFields {...props} disabled={pending} />;
};

export { VehicleFormDialog };
export type { VehicleFormDialogProps };
