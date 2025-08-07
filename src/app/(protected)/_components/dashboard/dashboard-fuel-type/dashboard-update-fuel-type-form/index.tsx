import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
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
  DashboardUpdateFuelTypeContainerProps,
  DashboardUpdateFuelTypeFormState,
} from "./dto";

import { DashboardFuelTypeProps } from "../dto";
import { useDashboardUpdateFuelTypeForm } from "./hooks";

import { allowedFuelTypes } from "@/schemas/create-update-fuel-type-schema";
import { useAuthStore } from "@/store/auth-store";

import { cn } from "@/lib/utils";

interface DashboardUpdateFuelTypeProps {
  fuelTypeData: DashboardFuelTypeProps;
  handleCloseUpdateFuelType: () => void;
  isUpdateFuelTypeOpen: boolean;
}

const DashboardUpdateFuelTypeFormContainer = ({
  state,
  handleCloseUpdateFuelType,
  handleUpdateDescription,
  isDirty,
  fuelTypeValues: { description },
}: DashboardUpdateFuelTypeContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-6 mt-2">
      <div className="w-full flex flex-col gap-3">
        <Label
          htmlFor="description"
          className={cn(
            state.updateFuelTypeError?.description &&
              "h-4 truncate text-red-500",
          )}
        >
          {state.updateFuelTypeError?.description
            ? state.updateFuelTypeError?.description
            : "Combustível"}
        </Label>
        <Select
          name="description"
          disabled={pending}
          value={description}
          onValueChange={(value: string) => handleUpdateDescription(value)}
        >
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

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCloseUpdateFuelType}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !isDirty}>
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

const DashboardUpdateFuelTypeForm = ({
  fuelTypeData,
  handleCloseUpdateFuelType,
  isUpdateFuelTypeOpen,
}: DashboardUpdateFuelTypeProps): JSX.Element => {
  const defaultState: DashboardUpdateFuelTypeFormState = {};
  const [state, dispatch] = useFormState(handleUpdateFuelType, null);

  const { formRef, description, isDirty, handleUpdateDescription } =
    useDashboardUpdateFuelTypeForm({
      state,
      fuelTypeValues: fuelTypeData,
      isUpdateFuelTypeOpen,
      handleCloseUpdateFuelType,
    });

  const { businessId } = useAuthStore();

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdateFuelTypeOpen) {
          formRef.current?.reset();

          handleUpdateDescription("");
        }

        handleCloseUpdateFuelType();
      }}
      open={isUpdateFuelTypeOpen}
    >
      <DialogScrollContent className="max-w-xl max-h-[90vh] overflow-y-auto">
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
              businessId: businessId as string,
              fuelTypeId: fuelTypeData.id,
            };

            appendExtraDataToForm(formData, extraData);
            return dispatch(formData);
          }}
        >
          <DashboardUpdateFuelTypeFormContainer
            state={state ?? defaultState}
            handleCloseUpdateFuelType={handleCloseUpdateFuelType}
            handleUpdateDescription={handleUpdateDescription}
            isDirty={isDirty}
            fuelTypeValues={{
              description,
            }}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardUpdateFuelTypeForm };
