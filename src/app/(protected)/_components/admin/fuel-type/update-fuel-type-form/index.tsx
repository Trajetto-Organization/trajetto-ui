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
import { SelectField } from "@/app/(protected)/_components/custom";

import { handleUpdateFuelType } from "@/actions/fuel-type/update-fuel-type";
import { appendDataToForm } from "@/lib/append-data-form";

import {
  UpdateFuelTypeFormSubmitProps,
  UpdateFuelTypeFormState,
  UpdateFuelTypeFormProps,
} from "./dto";
import { useUpdateFuelTypeForm } from "./hooks";

import { allowedFuelTypes } from "@/schemas/create-update-fuel-type-schema";
import { cn } from "@/lib/utils";

import { SearchBusiness } from "../../../search-business";

const UpdateFuelTypeFormSubmit = ({
  state,
  handleCloseUpdateFuelType,
  handleUpdateDescription,
  isDirty,
  fuelTypeValues: { description },
  commandBusinessInputValue,
  handleUpdateSearchBusinessInputValue,
}: UpdateFuelTypeFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { searchBusinessInputValue } = commandBusinessInputValue;

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
        value={description}
        onChange={(value: string) => handleUpdateDescription(value)}
        errorName={state.updateFuelTypeError?.description}
      />

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
        errorBusinessId={state.updateFuelTypeError?.businessId}
      />

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCloseUpdateFuelType}
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
          <span>Editar Combustível</span>
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

const UpdateFuelTypeForm = ({
  fuelTypeData,
  handleCloseUpdateFuelType,
  isUpdateFuelTypeOpen,
}: UpdateFuelTypeFormProps): JSX.Element => {
  const defaultState: UpdateFuelTypeFormState = {};
  const [state, dispatch] = useFormState<UpdateFuelTypeFormState, FormData>(
    handleUpdateFuelType,
    defaultState,
  );

  const {
    formRef,
    description,
    isDirty,
    handleUpdateDescription,
    commandBusinessInputValue,
    handleUpdateSearchBusinessInputValue,
  } = useUpdateFuelTypeForm({
    state,
    fuelTypeValues: fuelTypeData,
    isUpdateFuelTypeOpen,
    handleCloseUpdateFuelType,
  });

  const updateFuelTypeForm = (fuelTypeFormData: FormData) => {
    const updateFuelTypeData = {
      businessId: commandBusinessInputValue.businessId,
      fuelTypeId: fuelTypeData.id,
    };

    appendDataToForm(fuelTypeFormData, updateFuelTypeData);
    return dispatch(fuelTypeFormData);
  };

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdateFuelTypeOpen) {
          formRef.current?.reset();
        }

        handleCloseUpdateFuelType();
      }}
      open={isUpdateFuelTypeOpen}
    >
      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            Editar Tipo do Combustível
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição do
            tipo do combustível.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={updateFuelTypeForm}>
          <UpdateFuelTypeFormSubmit
            state={state}
            handleCloseUpdateFuelType={handleCloseUpdateFuelType}
            handleUpdateDescription={handleUpdateDescription}
            isDirty={isDirty}
            fuelTypeValues={{
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

export { UpdateFuelTypeForm };
