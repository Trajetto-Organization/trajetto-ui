import { useState, useEffect } from "react";
import { useFormState } from "react-dom";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CreateFuelFormState } from "./dto";
import { Button } from "@/components/ui/button";

import { handleCreateFuel } from "@/actions/fuel/create-fuel";
import { useCreateFuelForm } from "./hooks";

import { appendDataToForm } from "@/lib/append-data-form";

import { SelectBusinessBranchStep } from "@/app/(protected)/_components/steps/select-business-branch-step";
import { SelectVehicleDriverStep } from "@/app/(protected)/_components/steps/select-vehicle-driver-step";

import { SelectFuelTypeStep } from "@/app/(protected)/_components/steps/select-fuel-type-step";
import { CreateFuelFormSubmit } from "./create-fuel-form-submit";

const CreateFuelForm = (): JSX.Element => {
  const defaultState: CreateFuelFormState = {};
  const [state, dispatch] = useFormState<CreateFuelFormState, FormData>(
    handleCreateFuel,
    defaultState,
  );

  const [odometerFile, setOdometerFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // 📍 GEOLOCATION STATE
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  const handleLocationChange = (lat: number, lon: number) => {
    setLatitude(lat);
    setLongitude(lon);
  };

  const handleLocationLoadingChange = (isLoading: boolean) => {
    setIsLoadingLocation(isLoading);
  };

  const {
    isCreateFuelForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    commandFuelTypeInputValue,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchFuelTypeInputValue,
    handleBusinessBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBusinessBranchStep,
    handleBackToVehicleDriverStep,
    handleBackToFuelTypeStep,
    fuelFormValues,
    handleFormValuesChange,
  } = useCreateFuelForm(state);

  // Reset file and geolocation states when modal closes or on success
  useEffect(() => {
    if (!isCreateFuelForm) {
      setOdometerFile(null);
      setFileError(null);

      setLatitude(null);
      setLongitude(null);

      setIsLoadingLocation(false);
    }
  }, [isCreateFuelForm]);

  // Reset file and geolocation states on successful creation
  useEffect(() => {
    if (state?.successMessage) {
      setOdometerFile(null);
      setFileError(null);

      setLatitude(null);
      setLongitude(null);

      setIsLoadingLocation(false);
    }
  }, [state?.successMessage]);

  const createFuelForm = (fuelFormData: FormData) => {
    // Ensure mileage is sent unformatted
    const mileageInput = document.querySelector(
      'input[name="current_mileage"]',
    ) as HTMLInputElement;

    if (mileageInput && mileageInput.value.includes(".")) {
      // Remove points if still present
      const numericValue = mileageInput.value.replace(/\./g, "");
      mileageInput.value = numericValue;

      fuelFormData.set("current_mileage", numericValue);
    }

    const fuelData = {
      businessId: commandBusinessInputValue.businessId,
      branchId: commandBranchInputValue.branchId,
      vehicleId: commandVehicleInputValue.vehicleId,
      driverId: commandDriverInputValue.driverId,
      fuelTypeId: commandFuelTypeInputValue.fuelTypeId,
      latitude: latitude?.toString() as string, // Send as string or null
      longitude: longitude?.toString() as string, // Send as string or null
    };

    // Add the odometer photo file to FormData
    if (odometerFile) {
      fuelFormData.set("odometer_photo", odometerFile);
    }

    appendDataToForm(fuelFormData, fuelData);
    return dispatch(fuelFormData);
  };

  return (
    <Dialog open={isCreateFuelForm} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Abastecimento
        </Button>
      </DialogTrigger>

      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business-branch"
              ? "Selecionar Empresa e Filial"
              : currentStep === "select-vehicle-driver"
                ? "Selecionar Veículo e Motorista"
                : currentStep === "select-fuel-type"
                  ? "Selecionar Tipo de Combustível"
                  : "Criar Novo Abastecimento"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business-branch"
              ? "Selecione a empresa e filial para a qual deseja criar um abastecimento."
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e motorista para o abastecimento."
                : currentStep === "select-fuel-type"
                  ? "Selecione o tipo de combustível."
                  : "Insira as informações do abastecimento abaixo."}
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
            onContinue={handleBusinessBranchStepContinue}
            commandBusinessInputValue={commandBusinessInputValue}
            commandBranchInputValue={commandBranchInputValue}
            errorBranchId={state.createFuelError?.branchId}
            errorBusinessId={state.createFuelError?.businessId}
          />
        ) : currentStep === "select-vehicle-driver" ? (
          <SelectVehicleDriverStep
            businessId={commandBusinessInputValue.businessId}
            commandVehicleInputValue={commandVehicleInputValue}
            commandDriverInputValue={commandDriverInputValue}
            handleUpdateSearchVehicleInputValue={
              handleUpdateSearchVehicleInputValue
            }
            handleUpdateSearchDriverInputValue={
              handleUpdateSearchDriverInputValue
            }
            onContinue={handleVehicleDriverStepContinue}
            onBack={handleBackToBusinessBranchStep}
            errorDriverId={state.createFuelError?.driverId}
            errorVehicleId={state.createFuelError?.vehicleId}
          />
        ) : currentStep === "select-fuel-type" ? (
          <SelectFuelTypeStep
            businessId={commandBusinessInputValue.businessId}
            commandFuelTypeInputValue={commandFuelTypeInputValue}
            handleUpdateSearchFuelTypeInputValue={
              handleUpdateSearchFuelTypeInputValue
            }
            onContinue={handleFuelTypeStepContinue}
            onBack={handleBackToVehicleDriverStep}
            errorFuelTypeId={state.createFuelError?.fuelTypeId}
          />
        ) : (
          <form ref={formRef} action={createFuelForm}>
            <CreateFuelFormSubmit
              state={state}
              onBack={handleBackToFuelTypeStep}
              initialFormValues={fuelFormValues}
              onFormValuesChange={handleFormValuesChange}
              commandBusinessInputValue={commandBusinessInputValue}
              commandVehicleInputValue={commandVehicleInputValue}
              handleLocationChange={handleLocationChange}
              handleLocationLoadingChange={handleLocationLoadingChange}
              latitude={latitude}
              longitude={longitude}
              isLoadingLocation={isLoadingLocation}
              odometerFile={odometerFile}
              setOdometerFile={setOdometerFile}
              fileError={fileError}
              setFileError={setFileError}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateFuelForm };
