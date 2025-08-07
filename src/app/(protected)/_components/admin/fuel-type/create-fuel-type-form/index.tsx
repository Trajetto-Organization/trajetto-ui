"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader, X } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import { handleCreateFuelType } from "@/actions/create-fuel-type";

import { allowedFuelTypes } from "@/schemas/create-update-fuel-type-schema";

import { CreateFuelTypeContainerProps, CreateFuelTypeFormState } from "./dto";
import { useCreateFuelTypeForm } from "./hooks";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";
import { SearchBusiness } from "../../../search-business";

import { cn } from "@/lib/utils";

const CreateFuelTypeFormContainer = ({
  state,
  handleOpenCreateFuelTypeForm,
  handleUpdateSearchBussinessInputValue,
  commandBusinnessInputValue: { searchBusinessInputValue },
}: CreateFuelTypeContainerProps) => {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-6 mt-2">
      <div className="w-full flex flex-col gap-3">
        <Label
          htmlFor="description"
          className={cn(
            state.createFuelTypeError?.description &&
              "h-4 truncate text-red-500",
          )}
        >
          {state.createFuelTypeError?.description
            ? state.createFuelTypeError?.description
            : "Combustível"}
        </Label>
        <Select name="description" disabled={pending}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo do combustível" />
          </SelectTrigger>
          <SelectContent>
            {allowedFuelTypes.map((fuel) => (
              <SelectItem
                key={fuel}
                value={fuel}
                className="cursor-pointer hover:bg-accent 
                hover:text-accent-foreground"
              >
                {fuel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
  const [state, dispatch] = useFormState(handleCreateFuelType, null);

  const {
    isCreateFuelTypeForm,
    handleOpenCreateFuelTypeForm,
    commandBusinnessInputValue,
    handleUpdateSearchBussinessInputValue,
    formRef,
  } = useCreateFuelTypeForm(state);

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

      <DialogScrollContent className="max-w-xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Combustível</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação do
            tipo do combustível.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData: FormData) => {
            const extraData = {
              businessId: commandBusinnessInputValue.businessId,
            };

            appendExtraDataToForm(formData, extraData);
            return dispatch(formData);
          }}
        >
          <CreateFuelTypeFormContainer
            state={state ?? defaultState}
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
