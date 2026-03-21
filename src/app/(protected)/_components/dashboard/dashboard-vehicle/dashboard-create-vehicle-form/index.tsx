import { useFormState } from "react-dom";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { DashboardCreateVehicleFormState } from "./dashboard-create-vehicle-form.types";
import { Button } from "@/components/ui/button";

import { handleCreateVehicle } from "@/actions/vehicle/create-vehicle";
import { useDashboardCreateVehicleForm } from "./hooks";

import { useAuthStore } from "@/store/auth-store";
import { permissions } from "@/lib/permissions";

import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";
import { SelectDriverVehicleTypeStep } from "@/app/(protected)/_components/shared/steps/select-driver-vehicle-type-step";

import { SelectFuelTypeStep } from "@/app/(protected)/_components/shared/steps/select-fuel-type-step";
import { DashboardCreateVehicleFormSubmit } from "./dashboard-create-vehicle-form-submit";

const DashboardCreateVehicleForm = (): JSX.Element => {
  const defaultState: DashboardCreateVehicleFormState = {};
  const [state, dispatch] = useFormState<
    DashboardCreateVehicleFormState,
    FormData
  >(handleCreateVehicle, defaultState);

  const {
    isCreateVehicleForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBranchInputValue,
    commandDriverInputValue,
    commandVehicleTypeInputValue,
    commandFuelTypeInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchVehicleTypeInputValue,
    handleUpdateSearchFuelTypeInputValue,
    handleBranchStepContinue,
    handleDriverVehicleTypeStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBranchStep,
    handleBackToDriverVehicleTypeStep,
    handleBackToFuelTypeStep,
    vehicleFormValues,
    handleFormValuesChange,
  } = useDashboardCreateVehicleForm(state);

  const { businessId } = useAuthStore();
  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.VEHICLE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
    {
      key: permissions.FUEL_TYPE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.FUEL_TYPE_MANAGE),
    },
  ]);

  const createVehicleForm = (vehicleFormData: FormData) => {
    // Add selected IDs to form data
    vehicleFormData.append("businessId", businessId as string);

    if (commandBranchInputValue.branchId) {
      vehicleFormData.append("branchId", commandBranchInputValue.branchId);
    }

    if (commandDriverInputValue.driverId) {
      vehicleFormData.append("driverId", commandDriverInputValue.driverId);
    }

    if (commandVehicleTypeInputValue.vehicleTypeId) {
      vehicleFormData.append(
        "vehicleTypeId",
        commandVehicleTypeInputValue.vehicleTypeId,
      );
    }

    if (commandFuelTypeInputValue.fuelTypeId) {
      vehicleFormData.append(
        "fuelTypeId",
        commandFuelTypeInputValue.fuelTypeId,
      );
    }

    return dispatch(vehicleFormData);
  };

  return (
    <Dialog open={isCreateVehicleForm} onOpenChange={handleCloseDialog}>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <DialogTrigger
                asChild
                disabled={!permissionsRequired.hasAllPermissions}
                data-tutorial="create-button"
              >
                <Button
                  size="sm"
                  className="h-8 w-full"
                  disabled={!permissionsRequired.hasAllPermissions}
                >
                  Criar Veículo
                </Button>
              </DialogTrigger>
            </div>
          </TooltipTrigger>
          {!permissionsRequired.hasAllPermissions && (
            <TooltipContent className="max-w-sm">
              <p>{permissionsRequired.tooltipMessage}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-branch"
              ? "Selecionar Filial (Opcional)"
              : currentStep === "select-driver-vehicle-type"
                ? "Selecionar Motorista e Tipo de Veículo (Opcional)"
                : currentStep === "select-fuel-type"
                  ? "Selecionar Combustível"
                  : "Criar Novo Veículo"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para a qual deseja criar um veículo."
              : currentStep === "select-driver-vehicle-type"
                ? "Selecione um motorista e tipo de veículo."
                : currentStep === "select-fuel-type"
                  ? "Selecione o tipo de combustível para o veículo."
                  : "Insira as informações solicitadas abaixo para concluir a criação do veículo."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-branch" ? (
          <SelectBranchStep
            businessId={businessId as string}
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBranchStepContinue}
            commandBranchInputValue={commandBranchInputValue}
            errorBranchId={state.createVehicleError?.branchId}
            searchBranchIsOptional={true}
          />
        ) : currentStep === "select-driver-vehicle-type" ? (
          <SelectDriverVehicleTypeStep
            businessId={businessId as string}
            commandDriverInputValue={commandDriverInputValue}
            commandVehicleTypeInputValue={commandVehicleTypeInputValue}
            handleUpdateSearchDriverInputValue={
              handleUpdateSearchDriverInputValue
            }
            handleUpdateSearchVehicleTypeInputValue={
              handleUpdateSearchVehicleTypeInputValue
            }
            onContinue={handleDriverVehicleTypeStepContinue}
            onBack={handleBackToBranchStep}
            errorDriverId={state.createVehicleError?.driverId}
            errorVehicleTypeId={state.createVehicleError?.vehicleTypeId}
            searchDriverIsOptional={true}
            searchVehicleTypeIsOptional={true}
          />
        ) : currentStep === "select-fuel-type" ? (
          <SelectFuelTypeStep
            businessId={businessId as string}
            commandFuelTypeInputValue={commandFuelTypeInputValue}
            handleUpdateSearchFuelTypeInputValue={
              handleUpdateSearchFuelTypeInputValue
            }
            onContinue={handleFuelTypeStepContinue}
            onBack={handleBackToDriverVehicleTypeStep}
            errorFuelTypeId={state.createVehicleError?.fuelTypeId}
          />
        ) : (
          <form ref={formRef} action={createVehicleForm}>
            <DashboardCreateVehicleFormSubmit
              state={state}
              onBack={handleBackToFuelTypeStep}
              initialFormValues={vehicleFormValues}
              onFormValuesChange={handleFormValuesChange}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreateVehicleForm };
