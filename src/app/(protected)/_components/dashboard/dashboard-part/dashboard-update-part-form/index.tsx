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

import {
  DashboardUpdatePartFormSubmitProps,
  DashboardUpdatePartFormState,
} from "./dto";

import { DashboardPartProps } from "../dto";
import { useDashboardUpdatePartForm } from "./hooks";

import { SearchSupplier } from "../../../search-supplier";

import FormInput from "@/components/custom/form-input";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

interface DashboardUpdatePartProps {
  partData: DashboardPartProps;
  handleCloseUpdatePart: () => void;
  isUpdatePartOpen: boolean;
}

const DashboardUpdatePartFormSubmit = ({
  state,
  handleCloseUpdatePart,
  handleUpdateDescription,
  handleUnitPriceChange,
  handleUnitPriceBlur,
  isDirty,
  handleUpdateSearchSupplierInputValue,
  partValues: {
    description,
    displayUnitPrice,
    commandSupplierInputValue: { searchSupplierInputValue },
  },
}: DashboardUpdatePartFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { businessId } = useAuthStore();

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

      {searchSupplierInputValue && (
        <div className="grid grid-cols-2 gap-4 w-full">
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

      <div className="grid grid-cols-1 gap-4">
        <SearchSupplier
          errorSupplierId={state.updatePartError?.supplierId}
          searchSupplierInputValue={searchSupplierInputValue}
          businessId={businessId as string}
          handleUpdateSearchSupplierInputValue={
            handleUpdateSearchSupplierInputValue
          }
          isOptional={true}
        />
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
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

const DashboardUpdatePartForm = ({
  partData,
  handleCloseUpdatePart,
  isUpdatePartOpen,
}: DashboardUpdatePartProps): JSX.Element => {
  const defaultState: DashboardUpdatePartFormState = {};
  const [state, dispatch] = useFormState<
    DashboardUpdatePartFormState,
    FormData
  >(handleUpdatePart, defaultState);

  const {
    formRef,
    description,
    displayUnitPrice,
    isDirty,
    handleUpdateDescription,
    handleUnitPriceChange,
    handleUnitPriceBlur,
    commandSupplierInputValue,
    handleUpdateSearchSupplierInputValue,
  } = useDashboardUpdatePartForm({
    state,
    partValues: partData,
    isUpdatePartOpen,
    handleCloseUpdatePart,
  });

  const { businessId } = useAuthStore();

  const updatePartForm = (partFormData: FormData) => {
    const updatePartData = {
      businessId: businessId as string,
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

          const resetProfileAccessInputValue = {
            searchSupplierInputValue: "",
            supplierId: "",
          };

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
          <DashboardUpdatePartFormSubmit
            state={state}
            handleCloseUpdatePart={handleCloseUpdatePart}
            handleUpdateDescription={handleUpdateDescription}
            handleUnitPriceChange={handleUnitPriceChange}
            handleUnitPriceBlur={handleUnitPriceBlur}
            handleUpdateSearchSupplierInputValue={
              handleUpdateSearchSupplierInputValue
            }
            isDirty={isDirty}
            partValues={{
              description,
              displayUnitPrice,
              commandSupplierInputValue,
            }}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardUpdatePartForm };
