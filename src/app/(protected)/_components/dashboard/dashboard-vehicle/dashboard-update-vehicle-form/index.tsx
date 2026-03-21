import { useFormState } from "react-dom";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { handleUpdateVehicle } from "@/actions/vehicle/update-vehicle";
import { useDashboardUpdateVehicleForm } from "./hooks";

import { appendDataToForm } from "@/lib/append-data-form";
import { useAuthStore } from "@/store/auth-store";

import type {
  DashboardUpdateVehicleFormState,
  DashboardUpdateVehicleFormProps,
} from "./dashboard-update-vehicle-form.types";

import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";
import { SelectDriverVehicleTypeStep } from "@/app/(protected)/_components/shared/steps/select-driver-vehicle-type-step";

import { SelectFuelTypeStep } from "@/app/(protected)/_components/shared/steps/select-fuel-type-step";
import { DashboardUpdateVehicleFormSubmit } from "./dashboard-update-vehicle-form-submit";

const DashboardUpdateVehicleForm = ({
  vehicleData,
  handleCloseUpdateVehicle,
  isUpdateVehicleOpen,
}: DashboardUpdateVehicleFormProps): JSX.Element => {
  const defaultState: DashboardUpdateVehicleFormState = {};
  const [state, dispatch] = useFormState<
    DashboardUpdateVehicleFormState,
    FormData
  >(handleUpdateVehicle, defaultState);

  const {
    formRef,
    currentStep,
    commandBranchInputValue,
    commandDriverInputValue,
    commandVehicleTypeInputValue,
    commandFuelTypeInputValue,
    handleStepContinue,
    handleDriverVehicleTypeStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBranchStep,
    handleBackToDriverVehicleTypeStep,
    handleBackToFuelTypeStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchVehicleTypeInputValue,
    handleUpdateSearchFuelTypeInputValue,
    isBranchDirty,
    vehicleFormValues,
    handleFormValuesChange,
  } = useDashboardUpdateVehicleForm({
    state,
    handleCloseUpdateVehicle,
    vehicleData,
    isUpdateVehicleOpen,
  });

  const { businessId } = useAuthStore();

  const updateVehicleForm = (vehicleFormData: FormData) => {
    const updateVehicleData = {
      vehicleId: vehicleData.id,
      businessId: businessId as string,
      branchId: commandBranchInputValue.branchId,
      driverId: commandDriverInputValue.driverId,
      vehicleTypeId: commandVehicleTypeInputValue.vehicleTypeId,
      fuelTypeId: commandFuelTypeInputValue.fuelTypeId,
    };

    appendDataToForm(vehicleFormData, updateVehicleData);
    return dispatch(vehicleFormData);
  };

  return (
    <Dialog
      open={isUpdateVehicleOpen}
      onOpenChange={() => {
        if (isUpdateVehicleOpen) {
          formRef.current?.reset();
        }
        handleCloseUpdateVehicle();
      }}
    >
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
                  : "Editar Veículo"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para a qual deseja atualizar um veículo."
              : currentStep === "select-driver-vehicle-type"
                ? "Selecione um motorista e tipo de veículo."
                : currentStep === "select-fuel-type"
                  ? "Selecione o tipo de combustível para o veículo."
                  : "Atualize as informações solicitadas abaixo para concluir a atualização do veículo."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-branch" ? (
          <SelectBranchStep
            businessId={businessId as string}
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleStepContinue}
            commandBranchInputValue={commandBranchInputValue}
            errorBranchId={state.updateVehicleError?.branchId}
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
            errorDriverId={state.updateVehicleError?.driverId}
            errorVehicleTypeId={state.updateVehicleError?.vehicleTypeId}
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
            errorFuelTypeId={state.updateVehicleError?.fuelTypeId}
          />
        ) : (
          <form ref={formRef} action={updateVehicleForm}>
            <DashboardUpdateVehicleFormSubmit
              state={state}
              onBack={handleBackToFuelTypeStep}
              vehicleData={vehicleData}
              isBranchDirty={isBranchDirty}
              initialFormValues={vehicleFormValues}
              onFormValuesChange={handleFormValuesChange}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardUpdateVehicleForm };
