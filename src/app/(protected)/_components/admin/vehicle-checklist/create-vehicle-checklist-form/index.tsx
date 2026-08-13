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

import { Button } from "@/components/ui/button";

import type { CreateVehicleChecklistFormState } from "./create-vehicle-checklist-form.types";
import { handleCreateVehicleChecklist } from "@/actions/vehicle-checklist/create-vehicle-checklist";

import { useCreateVehicleChecklistForm } from "./hooks";

import { appendDataToForm } from "@/lib/append-data-form";
import { usePhotoUpload } from "@/hooks/use-photo-upload";

import { MAX_CHECKLIST_TOTAL_BYTES } from "@/lib/upload-limits";

import { SelectBusinessBranchStep } from "@/app/(protected)/_components/shared/steps/select-business-branch-step";
import { SelectVehicleDriverStep } from "@/app/(protected)/_components/shared/steps/select-vehicle-driver-step";

import { CreateVehicleChecklistFormSubmit } from "./create-vehicle-checklist-form-submit";

const CreateVehicleChecklistForm = (): JSX.Element => {
  const defaultState: CreateVehicleChecklistFormState = {};
  const [state, dispatch] = useFormState<
    CreateVehicleChecklistFormState,
    FormData
  >(handleCreateVehicleChecklist, defaultState);

  const [checklistFiles, setChecklistFiles] = useState<Record<string, File[]>>(
    {},
  );
  const [fileErrors, setFileErrors] = useState<Record<string, string | null>>(
    {},
  );

  const {
    isCreateVehicleChecklistForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleBusinessBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleBackToBusinessBranchStep,
    handleBackToVehicleDriverStep,
    checklistFormValues,
    handleFormValuesChange,
  } = useCreateVehicleChecklistForm(state);

  const { uploadProgress, uploadError, resetUpload, uploadPhotos } =
    usePhotoUpload();

  // Reset file states when modal closes or on success
  useEffect(() => {
    if (!isCreateVehicleChecklistForm) {
      setChecklistFiles({});
      setFileErrors({});

      resetUpload();
    }
  }, [isCreateVehicleChecklistForm]);

  // Reset file states on successful creation
  useEffect(() => {
    if (state?.successMessage) {
      setChecklistFiles({});
      setFileErrors({});

      resetUpload();
    }
  }, [state?.successMessage]);

  const createVehicleChecklistForm = async (
    vehicleChecklistFormData: FormData,
  ) => {
    // Ensure mileage is sent unformatted
    const mileageInput = document.querySelector(
      'input[name="current_mileage"]',
    ) as HTMLInputElement;

    if (mileageInput && mileageInput.value.includes(".")) {
      // Remove points if still present
      const numericValue = mileageInput.value.replace(/\./g, "");
      mileageInput.value = numericValue;

      vehicleChecklistFormData.set("current_mileage", numericValue);
    }

    const vehicleChecklistData = {
      businessId: commandBusinessInputValue.businessId,
      branchId: commandBranchInputValue.branchId,
      vehicleId: commandVehicleInputValue.vehicleId,
      driverId: commandDriverInputValue.driverId,
    };

    // Photos go straight from here to storage, never through the Server
    // Action — what reaches it is a list of keys.
    const photos = await uploadPhotos({
      files: checklistFiles,
      uploadType: "checklistPhotos",
      maxTotalBytes: MAX_CHECKLIST_TOTAL_BYTES,
      businessId: commandBusinessInputValue.businessId,
    });

    // Upload failed and the error is already on screen.
    if (!photos) return;

    vehicleChecklistFormData.set("photos", JSON.stringify(photos));

    appendDataToForm(vehicleChecklistFormData, vehicleChecklistData);
    return dispatch(vehicleChecklistFormData);
  };

  return (
    <Dialog
      open={isCreateVehicleChecklistForm}
      onOpenChange={handleCloseDialog}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Checklist
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
                : "Criar Novo Checklist Veicular"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business-branch"
              ? "Selecione a empresa e filial para a qual deseja criar um checklist."
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e motorista para o checklist."
                : "Preencha as informações do checklist veicular abaixo."}
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
            errorBranchId={state.createVehicleChecklistError?.branchId}
            errorBusinessId={state.createVehicleChecklistError?.businessId}
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
            errorDriverId={state.createVehicleChecklistError?.driverId}
            errorVehicleId={state.createVehicleChecklistError?.vehicleId}
          />
        ) : (
          <form ref={formRef} action={createVehicleChecklistForm}>
            <CreateVehicleChecklistFormSubmit
              state={state}
              onBack={handleBackToVehicleDriverStep}
              commandBusinessInputValue={commandBusinessInputValue}
              commandBranchInputValue={commandBranchInputValue}
              commandVehicleInputValue={commandVehicleInputValue}
              checklistFiles={checklistFiles}
              setChecklistFiles={setChecklistFiles}
              fileErrors={fileErrors}
              setFileErrors={setFileErrors}
              initialFormValues={checklistFormValues}
              onFormValuesChange={handleFormValuesChange}
              uploadProgress={uploadProgress}
              uploadError={uploadError}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateVehicleChecklistForm };
