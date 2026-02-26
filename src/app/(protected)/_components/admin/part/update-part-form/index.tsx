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

import { handleUpdatePart } from "@/actions/part/update-part";
import { appendDataToForm } from "@/lib/append-data-form";

import { UpdatePartFormSubmitProps, UpdatePartFormState } from "./dto";

import { PartProps } from "../dto";
import { useUpdatePartForm } from "./hooks";

import { SearchBusiness } from "../../../search-business";
import { SearchSupplier } from "../../../search-supplier";

import FormInput from "@/components/custom/form-input";
import { cn } from "@/lib/utils";

interface UpdatePartProps {
  partData: PartProps;
  handleCloseUpdatePart: () => void;
  isUpdatePartOpen: boolean;
}

const UpdatePartFormSubmit = ({
  state,
  handleCloseUpdatePart,
  handleUpdateDescription,
  handleUnitPriceChange,
  handleUnitPriceBlur,
  isDirty,
  handleUpdateSearchBusinessInputValue,
  handleUpdateSearchSupplierInputValue,
  partValues: {
    description,
    displayUnitPrice,
    commandBusinessInputValue: { searchBusinessInputValue, businessId },
    commandSupplierInputValue: { searchSupplierInputValue },
  },
}: UpdatePartFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-6 mt-2">
      <div className="space-y-5">
        <FormInput
          label={"Descrição da Peça *"}
          htmlfor={"description"}
          name="description"
          type="text"
          errorName={state.updatePartError?.description}
          value={description}
          onChange={(event) =>
            handleUpdateDescription(event.currentTarget.value)
          }
          placeholder={"Digite a descrição da peça"}
          disabled={pending}
        />

        <FormInput
          label={"Preço Unitário *"}
          htmlfor={"unit_price"}
          name="unit_price"
          type="text"
          errorName={state.updatePartError?.unit_price}
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
          errorBusinessId={state.updatePartError?.businessId}
        />

        {searchBusinessInputValue && (
          <SearchSupplier
            errorSupplierId={state.updatePartError?.supplierId}
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
          onClick={handleCloseUpdatePart}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !isDirty} className="flex-1">
          <span>Editar Peça</span>
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

const UpdatePartForm = ({
  partData,
  handleCloseUpdatePart,
  isUpdatePartOpen,
}: UpdatePartProps): JSX.Element => {
  const defaultState: UpdatePartFormState = {};
  const [state, dispatch] = useFormState<UpdatePartFormState, FormData>(
    handleUpdatePart,
    defaultState,
  );

  const {
    formRef,
    description,
    displayUnitPrice,
    isDirty,
    handleUpdateDescription,
    handleUnitPriceChange,
    handleUnitPriceBlur,
    commandBusinessInputValue,
    commandSupplierInputValue,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchSupplierInputValue,
  } = useUpdatePartForm({
    state,
    partValues: partData,
    isUpdatePartOpen,
    handleCloseUpdatePart,
  });

  const updatePartForm = (partFormData: FormData) => {
    const updatePartData = {
      businessId: commandBusinessInputValue.businessId,
      supplierId: commandSupplierInputValue.supplierId,
      partId: partData.id,
    };

    appendDataToForm(partFormData, updatePartData);
    return dispatch(partFormData);
  };

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdatePartOpen) {
          formRef.current?.reset();

          const resetBusinessInputValue = {
            searchBusinessInputValue: "",
            businessId: "",
          };

          const resetProfileAccessInputValue = {
            searchSupplierInputValue: "",
            supplierId: "",
          };

          handleUpdateSearchBusinessInputValue(resetBusinessInputValue);
          handleUpdateSearchSupplierInputValue(resetProfileAccessInputValue);

          handleUpdateDescription("");
        }

        handleCloseUpdatePart();
      }}
      open={isUpdatePartOpen}
    >
      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Peça</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição da
            peça.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={updatePartForm}>
          <UpdatePartFormSubmit
            state={state}
            handleCloseUpdatePart={handleCloseUpdatePart}
            handleUpdateDescription={handleUpdateDescription}
            handleUnitPriceChange={handleUnitPriceChange}
            handleUnitPriceBlur={handleUnitPriceBlur}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            handleUpdateSearchSupplierInputValue={
              handleUpdateSearchSupplierInputValue
            }
            isDirty={isDirty}
            partValues={{
              description,
              displayUnitPrice,
              commandBusinessInputValue,
              commandSupplierInputValue,
            }}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdatePartForm };
