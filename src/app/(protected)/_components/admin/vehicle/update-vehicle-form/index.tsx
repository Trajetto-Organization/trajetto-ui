import { useFormState } from "react-dom";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { handleUpdateVehicle } from "@/actions/vehicle/update-vehicle";

import type {
  UpdateVehicleFormState,
  UpdateVehicleFormProps,
} from "./update-vehicle-form.types";

import { appendDataToForm } from "@/lib/append-data-form";
import { UpdateVehicleFormSubmit } from "./update-vehicle-form-submit";

import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";
import { SelectDriverVehicleTypeStep } from "@/app/(protected)/_components/shared/steps/select-driver-vehicle-type-step";

import { SelectFuelTypeStep } from "@/app/(protected)/_components/shared/steps/select-fuel-type-step";
import { useUpdateVehicleForm } from "./hooks";

const UpdateVehicleForm = ({
  vehicleData,
  handleCloseUpdateVehicle,
  isUpdateVehicleOpen,
}: UpdateVehicleFormProps): JSX.Element => {
  const defaultState: UpdateVehicleFormState = {};
  const [state, dispatch] = useFormState<UpdateVehicleFormState, FormData>(
    handleUpdateVehicle,
    defaultState,
  );

  const {
    formRef,
    currentStep,
    commandBranchInputValue,
    commandDriverInputValue,
    commandVehicleTypeInputValue,
    commandFuelTypeInputValue,
    handleBranchStepContinue,
    handleDriverVehicleTypeStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBranchStep,
    handleBackToDriverVehicleTypeStep,
    handleBackToFuelTypeStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchVehicleTypeInputValue,
    handleUpdateSearchFuelTypeInputValue,
    isEntityDirty,
    vehicleFormValues,
    handleFormValuesChange,
  } = useUpdateVehicleForm({
    state,
    handleCloseUpdateVehicle,
    vehicleData,
    isUpdateVehicleOpen,
  });

  const updateVehicleForm = (vehicleFormData: FormData) => {
    const updateVehicleData = {
      vehicleId: vehicleData.id,
      businessId: vehicleData.businessId,
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
              ? "Selecionar Filial"
              : currentStep === "select-driver-vehicle-type"
                ? "Selecionar Motorista e Tipo de Veículo"
                : currentStep === "select-fuel-type"
                  ? "Selecionar Combustível"
                  : "Editar Veículo"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para a qual deseja editar um veículo (opcional)"
              : currentStep === "select-driver-vehicle-type"
                ? "Selecione opcionalmente um motorista e tipo de veículo."
                : currentStep === "select-fuel-type"
                  ? "Selecione o tipo de combustível para o veículo."
                  : "Atualize as informações solicitadas abaixo para concluir a atualização do veículo."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-branch" ? (
          <SelectBranchStep
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBranchStepContinue}
            commandBranchInputValue={commandBranchInputValue}
            errorBranchId={state.updateVehicleError?.branchId}
            searchBranchIsOptional={true}
            businessId={vehicleData.businessId}
          />
        ) : currentStep === "select-driver-vehicle-type" ? (
          <SelectDriverVehicleTypeStep
            businessId={vehicleData.businessId}
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
            businessId={vehicleData.businessId}
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
            <UpdateVehicleFormSubmit
              state={state}
              onBack={handleBackToFuelTypeStep}
              vehicleData={vehicleData}
              isEntityDirty={isEntityDirty}
              initialFormValues={vehicleFormValues}
              onFormValuesChange={handleFormValuesChange}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateVehicleForm };
