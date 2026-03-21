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
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";

import { handleCreateFuelType } from "@/actions/fuel-type/create-fuel-type";
import { allowedFuelTypes } from "@/schemas/create-update-fuel-type-schema";

import { SearchBusiness } from "@/app/(protected)/_components/shared/searches/search-business";
import { cn } from "@/lib/utils";

import type {
  CreateFuelTypeFormSubmitProps,
  CreateFuelTypeFormState,
} from "./create-fuel-type-form.types";
import { useCreateFuelTypeForm } from "./hooks";

const CreateFuelTypeFormSubmit = ({
  state,
  handleOpenCreateFuelTypeForm,
  handleUpdateSearchBussinessInputValue,
  commandBusinnessInputValue: { searchBusinessInputValue },
}: CreateFuelTypeFormSubmitProps) => {
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
        errorName={state.createFuelTypeError?.description}
      />

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
        errorBusinessId={state.createFuelTypeError?.businessId}
      />

      <div className="flex gap-2 mt-6">
        <Button
          variant="outline"
          type="button"
          onClick={handleOpenCreateFuelTypeForm}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          Criar Combustível
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

const CreateFuelTypeForm = (): JSX.Element => {
  const defaultState: CreateFuelTypeFormState = {};
  const [state, dispatch] = useFormState<CreateFuelTypeFormState, FormData>(
    handleCreateFuelType,
    defaultState,
  );

  const {
    isCreateFuelTypeForm,
    handleOpenCreateFuelTypeForm,
    commandBusinnessInputValue,
    handleUpdateSearchBussinessInputValue,
    formRef,
  } = useCreateFuelTypeForm(state);

  const createFuelTypeForm = (fuelTypeFormData: FormData) => {
    fuelTypeFormData.append(
      "businessId",
      commandBusinnessInputValue.businessId,
    );

    return dispatch(fuelTypeFormData);
  };

  return (
    <Dialog
      open={isCreateFuelTypeForm}
      onOpenChange={handleOpenCreateFuelTypeForm}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          Criar Combustível
        </Button>
      </DialogTrigger>

      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Combustível</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação do
            tipo do combustível.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={createFuelTypeForm}>
          <CreateFuelTypeFormSubmit
            state={state}
            handleOpenCreateFuelTypeForm={handleOpenCreateFuelTypeForm}
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

export { CreateFuelTypeForm };
