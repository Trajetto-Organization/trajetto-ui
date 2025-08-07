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

import {
  DashboardCreatePartFormState,
  DashboardCreatePartContainerProps,
} from "./dto";
import { useDashboardCreatePartForm } from "./hooks";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

import { cn } from "@/lib/utils";
import FormInput from "@/components/custom/form-input";

import { SearchSupplier } from "../../../search-supplier";
import { useAuthStore } from "@/store/auth-store";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

const DashboardCreatePartFormContainer = ({
  state,
  handleOpenCreatePartForm,
  handleUnitPriceChange,
  handleUnitPriceBlur,
  displayUnitPrice,
  commandSupplierInputValue: { searchSupplierInputValue },
  handleUpdateSearchSupplierInputValue,
}: DashboardCreatePartContainerProps) => {
  const { pending } = useFormStatus();
  const { businessId } = useAuthStore();

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
          errorSupplierId={state.createPartError?.supplierId}
          searchSupplierInputValue={searchSupplierInputValue}
          businessId={businessId as string}
          handleUpdateSearchSupplierInputValue={
            handleUpdateSearchSupplierInputValue
          }
          isOptional={true}
        />
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

const DashboardCreatePartForm = (): JSX.Element => {
  const defaultState: DashboardCreatePartFormState = {};
  const [state, dispatch] = useFormState(handleCreatePart, null);

  const {
    isCreatePartForm,
    handleOpenCreatePartForm,
    commandSupplierInputValue,
    handleUpdateSearchSupplierInputValue,
    displayUnitPrice,
    handleUnitPriceChange,
    handleUnitPriceBlur,
    formRef,
  } = useDashboardCreatePartForm(state);

  const { businessId } = useAuthStore();
  const hasUserPermission = useHasPermission(permissions.PART_MANAGE, "write");

  return (
    <Dialog open={isCreatePartForm} onOpenChange={handleOpenCreatePartForm}>
      <DialogTrigger
        asChild
        disabled={!hasUserPermission}
        data-tutorial="create-button"
      >
        <Button size="sm" className="h-8">
          Criar Peça
        </Button>
      </DialogTrigger>

      <DialogScrollContent className="max-w-xl max-h-[90vh] overflow-y-auto">
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
              businessId: businessId as string,
              supplierId: commandSupplierInputValue.supplierId,
            };

            appendExtraDataToForm(formData, extraData);
            return dispatch(formData);
          }}
        >
          <DashboardCreatePartFormContainer
            state={state ?? defaultState}
            handleOpenCreatePartForm={handleOpenCreatePartForm}
            handleUnitPriceChange={handleUnitPriceChange}
            handleUnitPriceBlur={handleUnitPriceBlur}
            displayUnitPrice={displayUnitPrice}
            handleUpdateSearchSupplierInputValue={
              handleUpdateSearchSupplierInputValue
            }
            commandSupplierInputValue={commandSupplierInputValue}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreatePartForm };
