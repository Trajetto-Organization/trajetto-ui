"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";

import { handleCreateVehicleType } from "@/actions/vehicle-type/create-vehicle-type";
import { handleUpdateVehicleType } from "@/actions/vehicle-type/update-vehicle-type";

import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";
import { guardFormAction } from "@/lib/action-result";
import { formatNumericInput } from "@/lib/format-values";
import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";
import {
  CNH_CATEGORIES,
  vehicleTypeFieldsSchema,
  type CnhCategory,
} from "@/schemas/create-update-vehicle-type-schema";

import type { VehicleTypeRow } from "../types";
import {
  CNH_CATEGORY_LABELS,
  EMPTY_VEHICLE_TYPE,
  vehicleTypeEditPayload,
  vehicleTypeFormValues,
  type VehicleTypeFormValues,
} from "../lib/form";

interface VehicleTypeFormDialogProps {
  businessId: string;
  /** Present to edit, absent to create. */
  vehicleType?: VehicleTypeRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Radix Select refuses "" as an item value; this stands for "no category".
const NO_CATEGORY = "NONE";

interface FormState {
  errors?: Partial<Record<string, string[]>>;
  errorMessage?: string;
  successMessage?: string;
}

function normalizeState(raw: unknown): FormState {
  const state = (raw ?? {}) as Record<string, unknown>;
  const error = (state.createVehicleTypeError ??
    state.updateVehicleTypeError) as Record<string, unknown> | undefined;

  if (!error)
    return { successMessage: state.successMessage as string | undefined };

  const {
    createVehicleTypeErrorMessage,
    updateVehicleTypeErrorMessage,
    ...fields
  } = error;

  return {
    errors: fields as Partial<Record<string, string[]>>,
    errorMessage: (createVehicleTypeErrorMessage ??
      updateVehicleTypeErrorMessage) as string | undefined,
  };
}

const SubmitButton = ({
  label,
  disabled,
}: {
  label: string;
  disabled: boolean;
}) => {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="flex-1" disabled={pending || disabled}>
      <span>{label}</span>
      {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
    </Button>
  );
};

/**
 * Creating and editing a vehicle type, one dialog for /admin and /dashboard
 * (decision 8.7). A single step: Cancelar + the action side by side
 * (decision 3.2), and on edit the action waits for a change (decision 2.5).
 * Live validation with the action's schema (decision 16.700); on edit only
 * the changed fields are checked, as only those are sent.
 */
const VehicleTypeFormDialog = ({
  businessId,
  vehicleType,
  open,
  onOpenChange,
}: VehicleTypeFormDialogProps): JSX.Element => {
  const isEdit = Boolean(vehicleType);
  const { revalidate } = useRevalidateScreen();

  const initial = useMemo(
    () =>
      vehicleType ? vehicleTypeFormValues(vehicleType) : EMPTY_VEHICLE_TYPE,
    [vehicleType],
  );

  const [values, setValues] = useState<VehicleTypeFormValues>(initial);

  // One action shape for both server actions: the state is read through
  // normalizeState, which knows either answer.
  const [rawState, dispatch] = useFormState<unknown, FormData>(
    guardFormAction((previous: unknown, data: FormData): Promise<unknown> =>
      (isEdit ? handleUpdateVehicleType : handleCreateVehicleType)(
        previous,
        data,
      ),
    ),
    {},
  );
  // Memoized: live validation resets its server-error snapshot whenever the
  // errors object changes, so a fresh one per render would never let a
  // server message clear on edit.
  const state = useMemo(() => normalizeState(rawState), [rawState]);

  const editPayload = vehicleType
    ? vehicleTypeEditPayload(initial, values)
    : {};
  const isDirty = Object.keys(editPayload).length > 0;

  const live = useLiveValidation({
    // The edit sends (and the action parses) only what changed: an untouched
    // legacy value is never judged by today's rule.
    schema: isEdit
      ? vehicleTypeFieldsSchema.pick(
          Object.fromEntries(
            Object.keys(editPayload).map((key) => [key, true]),
          ) as {
            description?: true;
            number_of_axles?: true;
            required_cnh_category?: true;
          },
        )
      : vehicleTypeFieldsSchema,
    values,
    fields: isEdit ? Object.keys(editPayload) : undefined,
    serverErrors: state.errors,
  });

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

  const submit = () => {
    if (!live.isValid()) return;

    const payload = isEdit
      ? { ...editPayload, vehicleTypeId: vehicleType!.id, businessId }
      : { ...values, businessId };

    const data = new FormData();
    for (const [key, value] of Object.entries(payload)) data.append(key, value);

    return dispatch(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar tipo de veículo" : "Novo tipo de veículo"}
          </DialogTitle>
          <DialogDescription>
            O tipo dá os eixos padrão aos veículos e diz a categoria de CNH
            exigida para dirigi-los; a atribuição de rota avisa quando a do
            motorista não cobre.
          </DialogDescription>
        </DialogHeader>

        <form ref={live.ref} action={submit} noValidate className="space-y-4">
          <FormInput
            label="Nome *"
            htmlfor="description"
            name="description"
            type="text"
            placeholder="Ex.: Truck, VUC, Carreta"
            value={values.description}
            onChange={(event) =>
              setValues({ ...values, description: event.target.value })
            }
            errorName={live.errorOf("description")}
          />

          <FormInput
            label="Número de eixos *"
            htmlfor="number_of_axles"
            name="number_of_axles"
            type="number"
            min="1"
            max="10"
            step="1"
            inputMode="numeric"
            placeholder="Ex.: 3"
            hint="Os veículos deste tipo começam com este número; cada um pode ajustar."
            value={values.number_of_axles}
            onChange={(event) =>
              setValues({ ...values, number_of_axles: event.target.value })
            }
            errorName={live.errorOf("number_of_axles")}
            onInput={(event) => formatNumericInput(event, 10)}
          />

          <SelectField
            label="Categoria de CNH exigida (opcional)"
            htmlfor="required_cnh_category"
            name="required_cnh_category"
            value={values.required_cnh_category || NO_CATEGORY}
            onChange={(value) =>
              setValues({
                ...values,
                required_cnh_category:
                  value === NO_CATEGORY ? "" : (value as CnhCategory),
              })
            }
            errorName={live.errorOf("required_cnh_category")}
            placeholder="Selecione a categoria"
            options={[
              { value: NO_CATEGORY, label: "Não exigir categoria" },
              ...CNH_CATEGORIES.map((category) => ({
                value: category,
                label: CNH_CATEGORY_LABELS[category],
              })),
            ]}
          />

          <DialogFormFooter className="pt-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
              >
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton
              label={isEdit ? "Salvar alterações" : "Criar tipo"}
              disabled={!canSubmitForm({ isEdit, isDirty })}
            />
          </DialogFormFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { VehicleTypeFormDialog };
