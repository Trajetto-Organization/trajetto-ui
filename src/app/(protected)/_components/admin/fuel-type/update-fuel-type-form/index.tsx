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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { handleUpdateFuelType } from "@/actions/update-fuel-type";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

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
      <div className="w-full flex flex-col gap-3">
        <div
          className={cn(
            "text-sm font-medium",
            state.updateFuelTypeError?.description &&
              "h-4 truncate text-red-500",
          )}
        >
          {state.updateFuelTypeError?.description
            ? state.updateFuelTypeError?.description
            : "Combustível"}
        </div>
        <Select
          name="description"
          disabled={pending}
          value={description}
          onValueChange={(value: string) => handleUpdateDescription(value)}
        >
          <SelectTrigger aria-label="Tipo do combustível">
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
      <DialogScrollContent className="max-w-xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Editar Tipo do Combustível
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição do
            tipo do combustível.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData: FormData) => {
            const extraData = {
              businessId: commandBusinessInputValue.businessId,
              fuelTypeId: fuelTypeData.id,
            };

            appendExtraDataToForm(formData, extraData);
            return dispatch(formData);
          }}
        >
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
