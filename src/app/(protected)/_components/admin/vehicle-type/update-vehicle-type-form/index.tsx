import { useFormState, useFormStatus } from "react-dom";
import { Loader, X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import { handleUpdateVehicleType } from "@/actions/vehicle-type/update-vehicle-type";
import { appendDataToForm } from "@/lib/append-data-form";

import type {
  UpdateVehicleTypeFormSubmitProps,
  UpdateVehicleTypeFormState,
} from "./update-vehicle-type-form.types";
import type { VehicleTypeProps } from "../vehicle-type.types";

import { SearchBusiness } from "@/app/(protected)/_components/shared/searches/search-business";
import { formatNumericInput } from "@/lib/format-values";

import { useUpdateVehicleTypeForm } from "./hooks";
import { cn } from "@/lib/utils";

interface UpdateVehicleTypeProps {
  vehicleTypeData: VehicleTypeProps;
  handleCloseUpdateVehicleType: () => void;
  isUpdateVehicleTypeOpen: boolean;
}

const UpdateVehicleTypeFormSubmit = ({
  state,
  handleCloseUpdateVehicleType,
  handleUpdateNumberOfAxles,
  handleUpdateDescription,
  isDirty,
  vehicleTypeValues: { number_of_axles, description },
  commandBusinessInputValue,
  handleUpdateSearchBusinessInputValue,
}: UpdateVehicleTypeFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { searchBusinessInputValue } = commandBusinessInputValue;

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

      {/* Business Selection */}
      {searchBusinessInputValue && (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-dashed truncate h-8 text-left",
            )}
          >
            <span>Empresa:</span>
            <span className="w-full truncate">{searchBusinessInputValue}</span>
          </div>
          <Button
            className="h-8 w-4"
            variant="ghost"
            onClick={() =>
              handleUpdateSearchBusinessInputValue({
                businessId: "",
                searchBusinessInputValue: "",
              })
            }
          >
            <X />
          </Button>
        </div>
      )}

      <SearchBusiness
        handleUpdateSearchBussinessInputValue={
          handleUpdateSearchBusinessInputValue
        }
        searchBusinessInputValue={searchBusinessInputValue}
        errorBusinessId={state.updateVehicleTypeError?.businessId}
      />

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCloseUpdateVehicleType}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            pending || !isDirty || !commandBusinessInputValue.businessId
          }
          className="flex-1"
        >
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
}: UpdateVehicleTypeProps): JSX.Element => {
  const defaultState: UpdateVehicleTypeFormState = {};
  const [state, dispatch] = useFormState<UpdateVehicleTypeFormState, FormData>(
    handleUpdateVehicleType,
    defaultState,
  );

  const {
    formRef,
    description,
    numberOfAxles,
    isDirty,
    handleUpdateDescription,
    handleUpdateNumberOfAxles,
    commandBusinessInputValue,
    handleUpdateSearchBusinessInputValue,
  } = useUpdateVehicleTypeForm({
    state,
    handleCloseUpdateVehicleType,
    vehicleTypeValues: vehicleTypeData,
    isUpdateVehicleTypeOpen,
  });

  const updateVehicleTypeForm = (vehicleTypeFormData: FormData) => {
    const updateVehicleTypeData = {
      businessId: commandBusinessInputValue.businessId,
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
          <UpdateVehicleTypeFormSubmit
            state={state}
            handleCloseUpdateVehicleType={handleCloseUpdateVehicleType}
            handleUpdateNumberOfAxles={handleUpdateNumberOfAxles}
            handleUpdateDescription={handleUpdateDescription}
            isDirty={isDirty}
            vehicleTypeValues={{
              number_of_axles: numberOfAxles,
              description,
            }}
            commandBusinessInputValue={commandBusinessInputValue}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateVehicleTypeForm };
