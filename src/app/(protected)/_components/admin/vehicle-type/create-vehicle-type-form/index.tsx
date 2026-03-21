"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader, X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import type {
  CreateVehicleTypeFormSubmitProps,
  CreateVehicleTypeFormState,
} from "./create-vehicle-type-form.types";

import { SearchBusiness } from "@/app/(protected)/_components/shared/searches/search-business";
import { handleCreateVehicleType } from "@/actions/vehicle-type/create-vehicle-type";

import { formatNumericInput } from "@/lib/format-values";
import { cn } from "@/lib/utils";

import { useCreateVehicleTypeForm } from "./hooks";

const CreateVehicleTypeFormSubmit = ({
  state,
  handleOpenCreateVehicleTypeForm,
  handleUpdateSearchBussinessInputValue,
  commandBusinnessInputValue: { searchBusinessInputValue },
}: CreateVehicleTypeFormSubmitProps) => {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-6 mt-2">
      <div className="space-y-5">
        <FormInput
          label={"Descrição do Veículo *"}
          htmlfor={"description"}
          name="description"
          type="text"
          errorName={state.createVehicleTypeError?.description}
          placeholder={"Digite a descrição do veículo"}
          disabled={pending}
        />

        <FormInput
          label="Quantidade de Eixos *"
          htmlfor="number_of_axles"
          name="number_of_axles"
          type="number"
          min="1"
          max="10"
          step="1"
          inputMode="numeric"
          errorName={state.createVehicleTypeError?.number_of_axles}
          placeholder="Digite a quantidade de eixos do tipo de veículo"
          disabled={pending}
          onInput={(event) => formatNumericInput(event, 10)}
        />
      </div>

      {searchBusinessInputValue && (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-dashed truncate h-8 text-center max-w-96 block leading-4",
            )}
          >
            {searchBusinessInputValue}
          </div>
          <Button
            className="h-8 w-4"
            variant="ghost"
            onClick={() =>
              handleUpdateSearchBussinessInputValue({
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
          handleUpdateSearchBussinessInputValue
        }
        searchBusinessInputValue={searchBusinessInputValue}
        errorBusinessId={state.createVehicleTypeError?.businessId}
      />

      <div className="flex gap-2 mt-6">
        <Button
          variant="outline"
          type="button"
          onClick={handleOpenCreateVehicleTypeForm}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          Criar Tipo do Veículo
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

const CreateVehicleTypeForm = (): JSX.Element => {
  const defaultState: CreateVehicleTypeFormState = {};
  const [state, dispatch] = useFormState<CreateVehicleTypeFormState, FormData>(
    handleCreateVehicleType,
    defaultState,
  );

  const {
    isCreateCreateVehicleTypeForm,
    handleOpenCreateVehicleTypeForm,
    commandBusinnessInputValue,
    handleUpdateSearchBussinessInputValue,
    formRef,
  } = useCreateVehicleTypeForm(state);

  const createVehicleTypeForm = (vehicleTypeFormData: FormData) => {
    vehicleTypeFormData.append(
      "businessId",
      commandBusinnessInputValue.businessId,
    );

    return dispatch(vehicleTypeFormData);
  };

  return (
    <Dialog
      open={isCreateCreateVehicleTypeForm}
      onOpenChange={handleOpenCreateVehicleTypeForm}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          Criar Tipo do Veículo
        </Button>
      </DialogTrigger>

      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Tipo do Veículo</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação do
            tipo do veículo.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={createVehicleTypeForm}>
          <CreateVehicleTypeFormSubmit
            state={state}
            handleOpenCreateVehicleTypeForm={handleOpenCreateVehicleTypeForm}
            handleUpdateSearchBussinessInputValue={
              handleUpdateSearchBussinessInputValue
            }
            commandBusinnessInputValue={commandBusinnessInputValue}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateVehicleTypeForm };
