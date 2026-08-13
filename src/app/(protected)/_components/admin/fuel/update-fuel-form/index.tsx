import { useState, useEffect } from "react";
import { useFormState } from "react-dom";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { handleUpdateFuel } from "@/actions/fuel/update-fuel";
import { useUpdateFuelForm } from "./hooks";

import type {
  UpdateFuelFormState,
  UpdateFuelFormProps,
} from "./update-fuel-form.types";

import { appendDataToForm } from "@/lib/append-data-form";
import { usePhotoUpload } from "@/hooks/use-photo-upload";

import { UpdateFuelFormSubmit } from "./update-fuel-form-submit";
import { SelectVehicleDriverStep } from "@/app/(protected)/_components/shared/steps/select-vehicle-driver-step";

import { SelectFuelTypeStep } from "@/app/(protected)/_components/shared/steps/select-fuel-type-step";
import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";

const UpdateFuelForm = ({
  fuelData,
  handleCloseUpdateFuel,
  isUpdateFuelOpen,
}: UpdateFuelFormProps): JSX.Element => {
  const defaultState: UpdateFuelFormState = {};
  const [state, dispatch] = useFormState<UpdateFuelFormState, FormData>(
    handleUpdateFuel,
    defaultState,
  );

  const [odometerFile, setOdometerFile] = useState<File | null>(null);

  const { uploadProgress, uploadError, resetUpload, uploadPhotos } =
    usePhotoUpload();
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
    isEntityDirty,
    fuelFormValues,
    handleFormValuesChange,
  } = useUpdateFuelForm({
    state,
    handleCloseUpdateFuel,
    fuelData,
    isUpdateFuelOpen,
  });

  const updateFuelForm = async (fuelFormData: FormData) => {
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
      businessId: fuelData.businessId,
      branchId: commandBranchInputValue.branchId,
      vehicleId: commandVehicleInputValue.vehicleId,
      driverId: commandDriverInputValue.driverId,
      fuelTypeId: commandFuelTypeInputValue.fuelTypeId,
    };

    // Add the odometer photo file to FormData if selected
    // The photo goes straight from here to storage; only its key reaches the
    // Server Action.
    if (odometerFile) {
      const photos = await uploadPhotos({
        files: { odometer_photo: [odometerFile] },
        uploadType: "odometerPhotos",
        businessId: fuelData.businessId,
      });

      // Upload failed and the error is already on screen.
      if (!photos) return;

      fuelFormData.set("photoKey", photos[0].key);
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

        resetUpload();
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
              ? "Selecione a filial para qual deseja atualizar o abastecimento."
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e motorista para o abastecimento."
                : currentStep === "select-fuel-type"
                  ? "Selecione o tipo de combustível."
                  : "Atualize as informações solicitadas abaixo para concluir a atualização do abastecimento."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-branch" ? (
          <SelectBranchStep
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBranchStepContinue}
            commandBranchInputValue={commandBranchInputValue}
            errorBranchId={state.updateFuelError?.branchId}
            businessId={fuelData.businessId}
          />
        ) : currentStep === "select-vehicle-driver" ? (
          <SelectVehicleDriverStep
            businessId={fuelData.businessId}
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
            businessId={fuelData.businessId}
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
            <UpdateFuelFormSubmit
              state={state}
              onBack={handleBackToFuelTypeStep}
              fuelData={fuelData}
              isEntityDirty={isEntityDirty}
              initialFormValues={fuelFormValues}
              onFormValuesChange={handleFormValuesChange}
              commandVehicleInputValue={commandVehicleInputValue}
              handleLocationChange={handleLocationChange}
              handleLocationLoadingChange={handleLocationLoadingChange}
              latitude={latitude}
              longitude={longitude}
              isLoadingLocation={isLoadingLocation}
              odometerFile={odometerFile}
              uploadProgress={uploadProgress}
              uploadError={uploadError}
              setOdometerFile={setOdometerFile}
              fileError={fileError}
              setFileError={setFileError}
              showImageModal={showImageModal}
              setShowImageModal={setShowImageModal}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateFuelForm };
