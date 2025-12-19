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
import { handleCreatePart } from "@/actions/create-part";

import { CreatePartFormState, CreatePartFormSubmitProps } from "./dto";
import { useCreatePartForm } from "./hooks";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

import { cn } from "@/lib/utils";
import FormInput from "@/components/custom/form-input";

import { SearchBusiness } from "../../../search-business";
import { SearchSupplier } from "../../../search-supplier";

const CreatePartFormSubmit = ({
  state,
  handleOpenCreatePartForm,
  handleUnitPriceChange,
  handleUnitPriceBlur,
  displayUnitPrice,
  handleUpdateSearchBusinessInputValue,
  commandBusinnessInputValue: { searchBusinessInputValue, businessId },
  commandSupplierInputValue: { searchSupplierInputValue },
  handleUpdateSearchSupplierInputValue,
}: CreatePartFormSubmitProps) => {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-6 mt-2">
      <div className="space-y-5">
        <FormInput
          label={"Descrição da Peça"}
          htmlfor={"description"}
          name="description"
          type="text"
          errorName={state.createPartError?.description}
          placeholder={"Digite a descrição da peça"}
          disabled={pending}
        />

        <FormInput
          label={"Preço Unitário"}
          htmlfor={"unit_price"}
          name="unit_price"
          type="text"
          errorName={state.createPartError?.unit_price}
          value={displayUnitPrice}
          onChange={handleUnitPriceChange}
          onBlur={handleUnitPriceBlur}
          placeholder={"0,00"}
          disabled={pending}
        />
      </div>

      {(searchSupplierInputValue || searchBusinessInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {searchBusinessInputValue && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Empresa:</span>
                <span className="w-full truncate">
                  {searchBusinessInputValue}
                </span>
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

          {searchSupplierInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Fornecedor:</span>
                <span className="w-full truncate">
                  {searchSupplierInputValue}
                </span>
              </div>

              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchSupplierInputValue({
                    supplierId: "",
                    searchSupplierInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}
        </div>
      )}

      <div
        className={`grid ${
          searchBusinessInputValue
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1"
        } gap-4`}
      >
        <SearchBusiness
          handleUpdateSearchBussinessInputValue={
            handleUpdateSearchBusinessInputValue
          }
          searchBusinessInputValue={searchBusinessInputValue}
          errorBusinessId={state.createPartError?.businessId}
        />

        {searchBusinessInputValue && (
          <SearchSupplier
            errorSupplierId={state.createPartError?.supplierId}
            searchSupplierInputValue={searchSupplierInputValue}
            businessId={businessId}
            handleUpdateSearchSupplierInputValue={
              handleUpdateSearchSupplierInputValue
            }
            isOptional={true}
          />
        )}
      </div>

      <div className="flex gap-2 mt-6">
        <Button
          variant="outline"
          type="button"
          onClick={handleOpenCreatePartForm}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          Criar Peça
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

const CreatePartForm = (): JSX.Element => {
  const defaultState: CreatePartFormState = {};
  const [state, dispatch] = useFormState<CreatePartFormState, FormData>(
    handleCreatePart,
    defaultState,
  );

  const {
    isCreatePartForm,
    handleOpenCreatePartForm,
    commandBusinessInputValue,
    commandSupplierInputValue,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchSupplierInputValue,
    displayUnitPrice,
    handleUnitPriceChange,
    handleUnitPriceBlur,
    formRef,
  } = useCreatePartForm(state);

  return (
    <Dialog open={isCreatePartForm} onOpenChange={handleOpenCreatePartForm}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Peça
        </Button>
      </DialogTrigger>

      <DialogScrollContent className="max-w-xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Peça</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação da
            peça.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData: FormData) => {
            const extraData = {
              businessId: commandBusinessInputValue.businessId,
              supplierId: commandSupplierInputValue.supplierId,
            };

            appendExtraDataToForm(formData, extraData);
            return dispatch(formData);
          }}
        >
          <CreatePartFormSubmit
            state={state}
            handleOpenCreatePartForm={handleOpenCreatePartForm}
            handleUnitPriceChange={handleUnitPriceChange}
            handleUnitPriceBlur={handleUnitPriceBlur}
            displayUnitPrice={displayUnitPrice}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            handleUpdateSearchSupplierInputValue={
              handleUpdateSearchSupplierInputValue
            }
            commandBusinnessInputValue={commandBusinessInputValue}
            commandSupplierInputValue={commandSupplierInputValue}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreatePartForm };
