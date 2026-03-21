import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";

import { handleUpdateFuelType } from "@/actions/fuel-type/update-fuel-type";
import { appendDataToForm } from "@/lib/append-data-form";

import type {
  DashboardUpdateFuelTypeFormSubmitProps,
  DashboardUpdateFuelTypeFormState,
} from "./dashboard-update-fuel-type-form.types";

import type { DashboardFuelTypeProps } from "../dashboard-fuel-types.types";
import { allowedFuelTypes } from "@/schemas/create-update-fuel-type-schema";

import { useAuthStore } from "@/store/auth-store";
import { useDashboardUpdateFuelTypeForm } from "./hooks";

interface DashboardUpdateFuelTypeProps {
  fuelTypeData: DashboardFuelTypeProps;
  handleCloseUpdateFuelType: () => void;
  isUpdateFuelTypeOpen: boolean;
}

const DashboardUpdateFuelTypeFormSubmit = ({
  state,
  handleCloseUpdateFuelType,
  handleUpdateDescription,
  isDirty,
  fuelTypeValues: { description },
}: DashboardUpdateFuelTypeFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-6 mt-2">
      <SelectField
        name="description"
        label="Combustível *"
        placeholder="Tipo do combustível"
        htmlfor="description"
        options={allowedFuelTypes.map((fuel) => ({
          label: fuel,
          value: fuel,
        }))}
        disabled={pending}
        value={description}
        onChange={(value: string) => handleUpdateDescription(value)}
        errorName={state.updateFuelTypeError?.description}
      />

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCloseUpdateFuelType}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !isDirty} className="flex-1">
          <span>Editar Combustível</span>
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};

const DashboardUpdateFuelTypeForm = ({
  fuelTypeData,
  handleCloseUpdateFuelType,
  isUpdateFuelTypeOpen,
}: DashboardUpdateFuelTypeProps): JSX.Element => {
  const defaultState: DashboardUpdateFuelTypeFormState = {};
  const [state, dispatch] = useFormState<
    DashboardUpdateFuelTypeFormState,
    FormData
  >(handleUpdateFuelType, defaultState);

  const { formRef, description, isDirty, handleUpdateDescription } =
    useDashboardUpdateFuelTypeForm({
      state,
      fuelTypeValues: fuelTypeData,
      isUpdateFuelTypeOpen,
      handleCloseUpdateFuelType,
    });

  const { businessId } = useAuthStore();

  const updateFuelTypeForm = (fuelTypeFormData: FormData) => {
    const updateFuelTypeData = {
      businessId: businessId as string,
      fuelTypeId: fuelTypeData.id,
    };

    appendDataToForm(fuelTypeFormData, updateFuelTypeData);
    return dispatch(fuelTypeFormData);
  };

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdateFuelTypeOpen) {
          formRef.current?.reset();

          handleUpdateDescription("");
        }

        handleCloseUpdateFuelType();
      }}
      open={isUpdateFuelTypeOpen}
    >
      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            Editar Tipo do Combustível
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição do
            tipo do combustível.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={updateFuelTypeForm}>
          <DashboardUpdateFuelTypeFormSubmit
            state={state}
            handleCloseUpdateFuelType={handleCloseUpdateFuelType}
            handleUpdateDescription={handleUpdateDescription}
            isDirty={isDirty}
            fuelTypeValues={{
              description,
            }}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardUpdateFuelTypeForm };
