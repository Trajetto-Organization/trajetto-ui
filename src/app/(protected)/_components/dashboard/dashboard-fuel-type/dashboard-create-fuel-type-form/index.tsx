"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/app/(protected)/_components/custom";

import { handleCreateFuelType } from "@/actions/fuel-type/create-fuel-type";
import { allowedFuelTypes } from "@/schemas/create-update-fuel-type-schema";

import {
  DashboardCreateFuelTypeSubmitProps,
  DashboardCreateFuelTypeFormState,
} from "./dto";

import { useDashboardCreateFuelTypeForm } from "./hooks";
import { useAuthStore } from "@/store/auth-store";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

const DashboardCreateFuelTypeFormSubmit = ({
  state,
  handleOpenCreateFuelTypeForm,
}: DashboardCreateFuelTypeSubmitProps) => {
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

const DashboardCreateFuelTypeForm = (): JSX.Element => {
  const defaultState: DashboardCreateFuelTypeFormState = {};
  const [state, dispatch] = useFormState<
    DashboardCreateFuelTypeFormState,
    FormData
  >(handleCreateFuelType, defaultState);

  const { isCreateFuelTypeForm, handleOpenCreateFuelTypeForm, formRef } =
    useDashboardCreateFuelTypeForm(state);

  const { businessId } = useAuthStore();
  const hasUserPermission = useHasPermission(
    permissions.FUEL_TYPE_MANAGE,
    "write",
  );

  const createFuelTypeForm = (fuelTypeFormData: FormData) => {
    fuelTypeFormData.append("businessId", businessId as string);
    return dispatch(fuelTypeFormData);
  };

  return (
    <Dialog
      open={isCreateFuelTypeForm}
      onOpenChange={handleOpenCreateFuelTypeForm}
    >
      <DialogTrigger
        asChild
        disabled={!hasUserPermission}
        data-tutorial="create-button"
      >
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
          <DashboardCreateFuelTypeFormSubmit
            state={state}
            handleOpenCreateFuelTypeForm={handleOpenCreateFuelTypeForm}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreateFuelTypeForm };
