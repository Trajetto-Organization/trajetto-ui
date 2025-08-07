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
import FormInput from "@/components/custom/form-input";

import { handleUpdateVehicleType } from "@/actions/update-vehicle-type";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

import {
  UpdateVehicleTypeContainerProps,
  UpdateVehicleTypeFormState,
} from "./dto";

import { VehicleTypeProps } from "../dto";
import { useUpdateVehicleTypeForm } from "./hooks";

import { formatNumericInput } from "@/lib/format-values";

import { SearchBusiness } from "../../../search-business";
import { cn } from "@/lib/utils";

interface UpdateVehicleTypeProps {
  vehicleTypeData: VehicleTypeProps;
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
  commandBusinessInputValue,
  handleUpdateSearchBusinessInputValue,
}: UpdateVehicleTypeContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { searchBusinessInputValue } = commandBusinessInputValue;

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
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            pending || !isDirty || !commandBusinessInputValue.businessId
          }
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
  const [state, dispatch] = useFormState(handleUpdateVehicleType, null);

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
      <DialogScrollContent className="max-w-xl max-h-[90vh]">
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
              businessId: commandBusinessInputValue.businessId,
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
