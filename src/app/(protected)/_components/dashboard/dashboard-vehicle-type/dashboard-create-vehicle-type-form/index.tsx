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
import FormInput from "@/components/custom/form-input";

import {
  DashboardCreateVehicleTypeFormSubmitProps,
  DashboardCreateVehicleTypeFormState,
} from "./dto";

import { handleCreateVehicleType } from "@/actions/vehicle-type/create-vehicle-type";
import { useDashboardCreateVehicleTypeForm } from "./hooks";

import { useAuthStore } from "@/store/auth-store";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import { formatNumericInput } from "@/lib/format-values";

const DashboardCreateVehicleTypeFormSubmit = ({
  state,
  handleOpenCreateVehicleTypeForm,
}: DashboardCreateVehicleTypeFormSubmitProps) => {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-6 mt-2">
      <div className="space-y-5">
        <FormInput
          label={"Descrição do Veículo *"}
          htmlfor={"description"}
          name="description"
          type="text"
          errorName={state.createVehicleTypeError?.description}
          placeholder={"Digite a descrição do veículo"}
          disabled={pending}
        />

        <FormInput
          label="Quantidade de Eixos *"
          htmlfor="number_of_axles"
          name="number_of_axles"
          type="number"
          min="1"
          max="10"
          step="1"
          inputMode="numeric"
          errorName={state.createVehicleTypeError?.number_of_axles}
          placeholder="Digite a quantidade de eixos do tipo de veículo"
          disabled={pending}
          onInput={(event) => formatNumericInput(event, 10)}
        />
      </div>

      <div className="flex gap-2 mt-6">
        <Button
          variant="outline"
          type="button"
          onClick={handleOpenCreateVehicleTypeForm}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          Criar Tipo do Veículo
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

const DashboardCreateVehicleTypeForm = (): JSX.Element => {
  const defaultState: DashboardCreateVehicleTypeFormState = {};
  const [state, dispatch] = useFormState<
    DashboardCreateVehicleTypeFormState,
    FormData
  >(handleCreateVehicleType, defaultState);

  const {
    isCreateCreateVehicleTypeForm,
    handleOpenCreateVehicleTypeForm,
    formRef,
  } = useDashboardCreateVehicleTypeForm(state);

  const { businessId } = useAuthStore();
  const hasUserPermission = useHasPermission(
    permissions.VEHICLE_TYPE_MANAGE,
    "write",
  );

  const createVehicleTypeForm = (vehicleTypeFormData: FormData) => {
    vehicleTypeFormData.append("businessId", businessId as string);
    return dispatch(vehicleTypeFormData);
  };

  return (
    <Dialog
      open={isCreateCreateVehicleTypeForm}
      onOpenChange={handleOpenCreateVehicleTypeForm}
    >
      <DialogTrigger
        asChild
        disabled={!hasUserPermission}
        data-tutorial="create-button"
      >
        <Button size="sm" className="h-8">
          Criar Tipo do Veículo
        </Button>
      </DialogTrigger>

      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Tipo do Veículo</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação do
            tipo do veículo.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={createVehicleTypeForm}>
          <DashboardCreateVehicleTypeFormSubmit
            state={state}
            handleOpenCreateVehicleTypeForm={handleOpenCreateVehicleTypeForm}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreateVehicleTypeForm };
