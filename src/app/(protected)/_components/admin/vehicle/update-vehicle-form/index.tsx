import { useFormState } from "react-dom";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { handleUpdateVehicle } from "@/actions/update-vehicle";

import { useUpdateVehicleForm } from "./hooks";
import { UpdateVehicleFormState, UpdateVehicleFormProps } from "./dto";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";
import { UpdateVehicleFormSubmit } from "./update-vehicle-form-submit";

import { SelectBusinessBranchStep } from "@/app/(protected)/_components/steps/select-business-branch-step";
import { SelectDriverVehicleTypeStep } from "@/app/(protected)/_components/steps/select-driver-vehicle-type-step";

import { SelectFuelTypeStep } from "@/app/(protected)/_components/steps/select-fuel-type-step";

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
    commandBusinessInputValue,
    commandBranchInputValue,
    commandDriverInputValue,
    commandVehicleTypeInputValue,
    commandFuelTypeInputValue,
    handleBusinessStepContinue,
    handleDriverVehicleTypeStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBusinessStep,
    handleBackToDriverVehicleTypeStep,
    handleBackToFuelTypeStep,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchVehicleTypeInputValue,
    handleUpdateSearchFuelTypeInputValue,
    isBusinessAndBranchDirty,
  } = useUpdateVehicleForm({
    state,
    handleCloseUpdateVehicle,
    vehicleData,
    isUpdateVehicleOpen,
  });

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
      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business-branch"
              ? "Selecionar Empresa"
              : currentStep === "select-driver-vehicle-type"
                ? "Selecionar Motorista e Tipo de Veículo"
                : currentStep === "select-fuel-type"
                  ? "Selecionar Combustível"
                  : "Atualizar Veículo"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business-branch"
              ? "Selecione a empresa para a qual deseja editar um veículo (obrigatório) e opcionalmente uma filial."
              : currentStep === "select-driver-vehicle-type"
                ? "Selecione opcionalmente um motorista e tipo de veículo."
                : currentStep === "select-fuel-type"
                  ? "Selecione o tipo de combustível para o veículo."
                  : "Atualize as informações solicitadas abaixo para concluir a atualização do veículo."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business-branch" ? (
          <SelectBusinessBranchStep
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBusinessStepContinue}
            commandBusinessInputValue={commandBusinessInputValue}
            commandBranchInputValue={commandBranchInputValue}
            errorBranchId={state.updateVehicleError?.branchId}
            errorBusinessId={state.updateVehicleError?.businessId}
            searchBranchIsOptional={true}
          />
        ) : currentStep === "select-driver-vehicle-type" ? (
          <SelectDriverVehicleTypeStep
            businessId={commandBusinessInputValue.businessId}
            commandDriverInputValue={commandDriverInputValue}
            commandVehicleTypeInputValue={commandVehicleTypeInputValue}
            handleUpdateSearchDriverInputValue={
              handleUpdateSearchDriverInputValue
            }
            handleUpdateSearchVehicleTypeInputValue={
              handleUpdateSearchVehicleTypeInputValue
            }
            onContinue={handleDriverVehicleTypeStepContinue}
            onBack={handleBackToBusinessStep}
            errorDriverId={state.updateVehicleError?.driverId}
            errorVehicleTypeId={state.updateVehicleError?.vehicleTypeId}
            searchDriverIsOptional={true}
            searchVehicleTypeIsOptional={true}
          />
        ) : currentStep === "select-fuel-type" ? (
          <SelectFuelTypeStep
            businessId={commandBusinessInputValue.businessId}
            commandFuelTypeInputValue={commandFuelTypeInputValue}
            handleUpdateSearchFuelTypeInputValue={
              handleUpdateSearchFuelTypeInputValue
            }
            onContinue={handleFuelTypeStepContinue}
            onBack={handleBackToDriverVehicleTypeStep}
            errorFuelTypeId={state.updateVehicleError?.fuelTypeId}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              const extraData = {
                vehicleId: vehicleData.id,
                businessId: commandBusinessInputValue.businessId,
                branchId: commandBranchInputValue.branchId,
                driverId: commandDriverInputValue.driverId,
                vehicleTypeId: commandVehicleTypeInputValue.vehicleTypeId,
                fuelTypeId: commandFuelTypeInputValue.fuelTypeId,
              };

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <UpdateVehicleFormSubmit
              state={state}
              onBack={handleBackToFuelTypeStep}
              vehicleData={vehicleData}
              isBusinessAndBranchDirty={isBusinessAndBranchDirty}
              isUpdateVehicleOpen={isUpdateVehicleOpen}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateVehicleForm };
