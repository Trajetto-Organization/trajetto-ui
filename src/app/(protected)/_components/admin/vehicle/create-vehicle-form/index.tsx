import { useFormState } from "react-dom";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { handleCreateVehicle } from "@/actions/vehicle/create-vehicle";

import { useCreateVehicleForm } from "./hooks";
import { CreateVehicleFormState } from "./dto";

import { SelectBusinessBranchStep } from "@/app/(protected)/_components/steps/select-business-branch-step";
import { SelectDriverVehicleTypeStep } from "@/app/(protected)/_components/steps/select-driver-vehicle-type-step";

import { SelectFuelTypeStep } from "@/app/(protected)/_components/steps/select-fuel-type-step";
import { CreateVehicleFormSubmit } from "./create-vehicle-form-submit";

const CreateVehicleForm = (): JSX.Element => {
  const defaultState: CreateVehicleFormState = {};
  const [state, dispatch] = useFormState<CreateVehicleFormState, FormData>(
    handleCreateVehicle,
    defaultState,
  );

  const {
    isCreateVehicleForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    commandDriverInputValue,
    commandVehicleTypeInputValue,
    commandFuelTypeInputValue,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchVehicleTypeInputValue,
    handleUpdateSearchFuelTypeInputValue,
    handleBusinessStepContinue,
    handleDriverVehicleTypeStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBusinessStep,
    handleBackToDriverVehicleTypeStep,
    handleBackToFuelTypeStep,
    vehicleFormValues,
    handleFormValuesChange,
  } = useCreateVehicleForm(state);

  const createVehicleForm = (vehicleFormData: FormData) => {
    // Add selected IDs to form data
    vehicleFormData.append("businessId", commandBusinessInputValue.businessId);

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
      <DialogTrigger asChild data-tutorial="create-button">
        <Button size="sm" className="h-8 w-full">
          Criar Veículo
        </Button>
      </DialogTrigger>

      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business-branch"
              ? "Selecionar Empresa"
              : currentStep === "select-driver-vehicle-type"
                ? "Selecionar Motorista e Tipo de Veículo"
                : currentStep === "select-fuel-type"
                  ? "Selecionar Combustível"
                  : "Criar Novo Veículo"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business-branch"
              ? "Selecione a empresa para a qual deseja criar um veículo (obrigatório) e opcionalmente uma filial."
              : currentStep === "select-driver-vehicle-type"
                ? "Selecione opcionalmente um motorista e tipo de veículo."
                : currentStep === "select-fuel-type"
                  ? "Selecione o tipo de combustível para o veículo."
                  : "Insira as informações solicitadas abaixo para concluir a criação do veículo."}
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
            errorBranchId={state.createVehicleError?.branchId}
            errorBusinessId={state.createVehicleError?.businessId}
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
            errorDriverId={state.createVehicleError?.driverId}
            errorVehicleTypeId={state.createVehicleError?.vehicleTypeId}
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
            errorFuelTypeId={state.createVehicleError?.fuelTypeId}
          />
        ) : (
          <form ref={formRef} action={createVehicleForm}>
            <CreateVehicleFormSubmit
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

export { CreateVehicleForm };
