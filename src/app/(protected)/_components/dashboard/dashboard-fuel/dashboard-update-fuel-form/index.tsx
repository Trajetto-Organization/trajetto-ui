import { useState, useEffect } from "react";
import { useFormState } from "react-dom";

import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { handleUpdateFuel } from "@/actions/fuel/update-fuel";
import { useDashboardUpdateFuelForm } from "./hooks";

import {
  DashboardUpdateFuelFormState,
  DashboardUpdateFuelFormProps,
} from "./dto";

import { appendDataToForm } from "@/lib/append-data-form";
import { useAuthStore } from "@/store/auth-store";

import { DashboardUpdateFuelFormSubmit } from "./dashboard-update-fuel-form-submit";

import { SelectBranchStep } from "@/app/(protected)/_components/steps/select-branch-step";
import { SelectVehicleDriverStep } from "@/app/(protected)/_components/steps/select-vehicle-driver-step";

import { SelectFuelTypeStep } from "@/app/(protected)/_components/steps/select-fuel-type-step";

const DashboardUpdateFuelForm = ({
  fuelData,
  handleCloseUpdateFuel,
  isUpdateFuelOpen,
}: DashboardUpdateFuelFormProps): JSX.Element => {
  const { businessId } = useAuthStore();

  const defaultState: DashboardUpdateFuelFormState = {};
  const [state, dispatch] = useFormState<
    DashboardUpdateFuelFormState,
    FormData
  >(handleUpdateFuel, defaultState);

  const [odometerFile, setOdometerFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [showImageModal, setShowImageModal] = useState<boolean>(false);

  // 📍 GEOLOCATION STATE - Initialize with existing fuelData location
  const [latitude, setLatitude] = useState<number | null>(
    fuelData.latitude ?? null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    fuelData.longitude ?? null,
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  const handleLocationChange = (lat: number, lon: number) => {
    setLatitude(lat);
    setLongitude(lon);
  };

  const handleLocationLoadingChange = (isLoading: boolean) => {
    setIsLoadingLocation(isLoading);
  };

  // Reset location state when fuelData changes
  useEffect(() => {
    if (isUpdateFuelOpen) {
      setLatitude(fuelData.latitude ?? null);
      setLongitude(fuelData.longitude ?? null);

      setIsLoadingLocation(false);
    }
  }, [fuelData, isUpdateFuelOpen]);

  const {
    formRef,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    commandFuelTypeInputValue,
    handleBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleDriverStep,
    handleBackToFuelTypeStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchFuelTypeInputValue,
    isBusinessAndEntityDirty,
    fuelFormValues,
    handleFormValuesChange,
  } = useDashboardUpdateFuelForm({
    state,
    handleCloseUpdateFuel,
    fuelData,
    isUpdateFuelOpen,
  });

  const updateFuelForm = (fuelFormData: FormData) => {
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

    const updateFuelData = {
      fuelId: fuelData.id,
      businessId: businessId as string,
      branchId: commandBranchInputValue.branchId,
      vehicleId: commandVehicleInputValue.vehicleId,
      driverId: commandDriverInputValue.driverId,
      fuelTypeId: commandFuelTypeInputValue.fuelTypeId,
    };

    // Add the odometer photo file to FormData if provided
    if (odometerFile) {
      fuelFormData.set("odometer_photo", odometerFile);
    }

    // 📍 GEOLOCATION: Handle latitude/longitude separately to support null values
    // When null, send as empty string (backend will convert to null)
    if (latitude === null) {
      fuelFormData.append("latitude", "");
    } else if (latitude !== undefined) {
      fuelFormData.append("latitude", latitude.toString());
    }

    if (longitude === null) {
      fuelFormData.append("longitude", "");
    } else if (longitude !== undefined) {
      fuelFormData.append("longitude", longitude.toString());
    }

    appendDataToForm(fuelFormData, updateFuelData);
    return dispatch(fuelFormData);
  };

  return (
    <Dialog
      open={isUpdateFuelOpen}
      onOpenChange={() => {
        if (isUpdateFuelOpen) {
          formRef.current?.reset();
        }

        handleCloseUpdateFuel();
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
              : currentStep === "select-vehicle-driver"
                ? "Selecionar Veículo e Motorista"
                : currentStep === "select-fuel-type"
                  ? "Selecionar Tipo de Combustível"
                  : "Editar Abastecimento"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para a qual deseja atualizar o abastecimento."
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e motorista para o abastecimento."
                : currentStep === "select-fuel-type"
                  ? "Selecione o tipo de combustível."
                  : "Atualize as informações solicitadas abaixo para concluir a atualização do abastecimento."}
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
            errorBranchId={state.updateFuelError?.branchId}
          />
        ) : currentStep === "select-vehicle-driver" ? (
          <SelectVehicleDriverStep
            businessId={businessId as string}
            commandVehicleInputValue={commandVehicleInputValue}
            commandDriverInputValue={commandDriverInputValue}
            handleUpdateSearchVehicleInputValue={
              handleUpdateSearchVehicleInputValue
            }
            handleUpdateSearchDriverInputValue={
              handleUpdateSearchDriverInputValue
            }
            onContinue={handleVehicleDriverStepContinue}
            onBack={handleBackToBranchStep}
            errorDriverId={state.updateFuelError?.driverId}
            errorVehicleId={state.updateFuelError?.vehicleId}
          />
        ) : currentStep === "select-fuel-type" ? (
          <SelectFuelTypeStep
            businessId={businessId as string}
            commandFuelTypeInputValue={commandFuelTypeInputValue}
            handleUpdateSearchFuelTypeInputValue={
              handleUpdateSearchFuelTypeInputValue
            }
            onContinue={handleFuelTypeStepContinue}
            onBack={handleBackToVehicleDriverStep}
            errorFuelTypeId={state.updateFuelError?.fuelTypeId}
          />
        ) : (
          <form ref={formRef} action={updateFuelForm}>
            <DashboardUpdateFuelFormSubmit
              state={state}
              onBack={handleBackToFuelTypeStep}
              fuelData={fuelData}
              isBusinessAndEntityDirty={isBusinessAndEntityDirty}
              initialFormValues={fuelFormValues}
              onFormValuesChange={handleFormValuesChange}
              commandVehicleInputValue={commandVehicleInputValue}
              odometerFile={odometerFile}
              setOdometerFile={setOdometerFile}
              fileError={fileError}
              setFileError={setFileError}
              showImageModal={showImageModal}
              setShowImageModal={setShowImageModal}
              handleLocationChange={handleLocationChange}
              handleLocationLoadingChange={handleLocationLoadingChange}
              latitude={latitude}
              longitude={longitude}
              isLoadingLocation={isLoadingLocation}
            />
          </form>
        )}
      </DialogScrollContent>

      {/* Image Modal */}
      {showImageModal && fuelData.odometer_photo && (
        <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Visualizar Foto - Odômetro</DialogTitle>
              <DialogDescription>
                Foto do odômetro do abastecimento
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              <Image
                src={fuelData.odometer_photo}
                alt="Foto do Odômetro"
                width={800}
                height={600}
                className="max-w-full max-h-96 object-contain rounded-lg"
                unoptimized={
                  fuelData.odometer_photo.startsWith("data:") ||
                  fuelData.odometer_photo.includes("blob:")
                }
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export { DashboardUpdateFuelForm };
