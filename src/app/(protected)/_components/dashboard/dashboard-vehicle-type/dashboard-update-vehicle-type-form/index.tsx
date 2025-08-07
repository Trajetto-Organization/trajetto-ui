import { FormEvent } from "react";

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
import FormInput from "@/components/custom/form-input";

import { handleUpdateVehicleType } from "@/actions/update-vehicle-type";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

import {
  DashboardUpdateVehicleTypeContainerProps,
  DashboardUpdateVehicleTypeFormState,
} from "./dto";

import { DashboardVehicleTypeProps } from "../dto";
import { useDashboardUpdateVehicleTypeForm } from "./hooks";

import { useAuthStore } from "@/store/auth-store";

interface DashboardUpdateVehicleTypeProps {
  vehicleTypeData: DashboardVehicleTypeProps;
  handleCloseUpdateVehicleType: () => void;
  isUpdateVehicleTypeOpen: boolean;
}

const UpdateVehicleTypeFormContainer = ({
  state,
  handleCloseUpdateVehicleType,
  handleUpdateNumberOfAxles,
  handleUpdateDescription,
  isDirty,
  vehicleTypeValues: { number_of_axles, description },
}: DashboardUpdateVehicleTypeContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  const handleNumberOfAxles = (event: FormEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    let value = target.value;

    // Removes leading zeros (prevents the first digit from being 0)
    value = value.replace(/^0+/, "");

    // If there is no value (i.e. if there are only zeros), reset the input.
    if (value === "") {
      target.value = "";
      return;
    }

    // Convert to number to compare
    const numericValue = parseInt(value, 10);

    // If the value is greater than 10, force it to 10
    if (numericValue > 10) {
      target.value = "10";
    } else {
      // If not, keep the entered value.
      target.value = value;
    }
  };

  return (
    <div className="space-y-6 mt-2">
      <div className="space-y-5">
        <FormInput
          label={"Descrição do Veículo"}
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
          label="Quantidade de Eixos"
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
          onInput={handleNumberOfAxles}
          value={number_of_axles}
        />
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCloseUpdateVehicleType}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !isDirty}>
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
  const [state, dispatch] = useFormState(handleUpdateVehicleType, null);

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
      <DialogScrollContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Tipo do Veículo</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição do
            tipo do veículo.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData: FormData) => {
            const extraData = {
              businessId: businessId as string,
              vehicleTypeId: vehicleTypeData.id,
            };

            appendExtraDataToForm(formData, extraData);
            return dispatch(formData);
          }}
        >
          <UpdateVehicleTypeFormContainer
            state={state ?? defaultState}
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
