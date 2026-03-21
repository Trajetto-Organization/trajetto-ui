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
import FormInput from "@/components/shared/custom/form-input";

import { handleUpdateVehicleType } from "@/actions/vehicle-type/update-vehicle-type";
import { appendDataToForm } from "@/lib/append-data-form";

import type {
  DashboardUpdateVehicleTypeFormSubmitProps,
  DashboardUpdateVehicleTypeFormState,
} from "./dashboard-update-vehicle-type-form.types";
import type { DashboardVehicleTypeProps } from "../dashboard-vehicle-type.types";

import { useAuthStore } from "@/store/auth-store";
import { formatNumericInput } from "@/lib/format-values";

import { useDashboardUpdateVehicleTypeForm } from "./hooks";

interface DashboardUpdateVehicleTypeProps {
  vehicleTypeData: DashboardVehicleTypeProps;
  handleCloseUpdateVehicleType: () => void;
  isUpdateVehicleTypeOpen: boolean;
}

const DashboardUpdateVehicleTypeFormSubmit = ({
  state,
  handleCloseUpdateVehicleType,
  handleUpdateNumberOfAxles,
  handleUpdateDescription,
  isDirty,
  vehicleTypeValues: { number_of_axles, description },
}: DashboardUpdateVehicleTypeFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-6 mt-2">
      <div className="space-y-5">
        <FormInput
          label={"Descrição do Veículo *"}
          htmlfor={"description"}
          name="description"
          type="text"
          onChange={(event) =>
            handleUpdateDescription(event.currentTarget.value)
          }
          errorName={state.updateVehicleTypeError?.description}
          placeholder={"Digite a descrição do veículo"}
          disabled={pending}
          value={description}
        />

        <FormInput
          label="Quantidade de Eixos *"
          htmlfor="number_of_axles"
          name="number_of_axles"
          type="number"
          onChange={(event) =>
            handleUpdateNumberOfAxles(event.currentTarget.value)
          }
          min="1"
          max="10"
          step="1"
          inputMode="numeric"
          errorName={state.updateVehicleTypeError?.number_of_axles}
          placeholder="Digite a quantidade de eixos do tipo de veículo"
          disabled={pending}
          onInput={(event) => formatNumericInput(event, 10)}
          value={number_of_axles}
        />
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCloseUpdateVehicleType}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !isDirty} className="flex-1">
          <span>Editar Tipo do Veículo</span>
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

const UpdateVehicleTypeForm = ({
  vehicleTypeData,
  handleCloseUpdateVehicleType,
  isUpdateVehicleTypeOpen,
}: DashboardUpdateVehicleTypeProps): JSX.Element => {
  const defaultState: DashboardUpdateVehicleTypeFormState = {};
  const [state, dispatch] = useFormState<
    DashboardUpdateVehicleTypeFormState,
    FormData
  >(handleUpdateVehicleType, defaultState);

  const {
    formRef,
    description,
    numberOfAxles,
    isDirty,
    handleUpdateDescription,
    handleUpdateNumberOfAxles,
  } = useDashboardUpdateVehicleTypeForm({
    state,
    handleCloseUpdateVehicleType,
    vehicleTypeValues: vehicleTypeData,
    isUpdateVehicleTypeOpen,
  });

  const { businessId } = useAuthStore();

  const updateVehicleTypeForm = (vehicleTypeFormData: FormData) => {
    const updateVehicleTypeData = {
      businessId: businessId as string,
      vehicleTypeId: vehicleTypeData.id,
    };

    appendDataToForm(vehicleTypeFormData, updateVehicleTypeData);
    return dispatch(vehicleTypeFormData);
  };

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdateVehicleTypeOpen) {
          formRef.current?.reset();

          handleUpdateDescription("");
          handleUpdateNumberOfAxles("");
        }

        handleCloseUpdateVehicleType();
      }}
      open={isUpdateVehicleTypeOpen}
    >
      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Tipo do Veículo</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição do
            tipo do veículo.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={updateVehicleTypeForm}>
          <DashboardUpdateVehicleTypeFormSubmit
            state={state}
            handleCloseUpdateVehicleType={handleCloseUpdateVehicleType}
            handleUpdateNumberOfAxles={handleUpdateNumberOfAxles}
            handleUpdateDescription={handleUpdateDescription}
            isDirty={isDirty}
            vehicleTypeValues={{
              number_of_axles: numberOfAxles,
              description,
            }}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateVehicleTypeForm };
