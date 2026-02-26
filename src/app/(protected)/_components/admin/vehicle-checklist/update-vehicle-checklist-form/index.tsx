import { useState } from "react";
import { useFormState } from "react-dom";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { handleUpdateVehicleChecklist } from "@/actions/vehicle-checklist/update-vehicle-checklist";
import { useUpdateVehicleChecklistForm } from "./hooks";

import { appendDataToForm } from "@/lib/append-data-form";
import { UpdateChecklistFormSubmit } from "./update-vehicle-checklist-form-submit";

import { validateUpdatePhotoRequirements } from "../create-vehicle-checklist-form/utils/photo-requirements";

import { SelectBranchStep } from "../../../steps/select-branch-step";
import { SelectVehicleDriverStep } from "@/app/(protected)/_components/steps/select-vehicle-driver-step";

import {
  UpdateVehicleChecklistFormState,
  UpdateVehicleChecklistFormProps,
} from "./dto";
import { toast } from "sonner";

const UpdateVehicleChecklistForm = ({
  checklistData,
  handleCloseUpdateChecklist,
  isUpdateChecklistOpen,
}: UpdateVehicleChecklistFormProps): JSX.Element => {
  const defaultState: UpdateVehicleChecklistFormState = {};
  const [state, dispatch] = useFormState<
    UpdateVehicleChecklistFormState,
    FormData
  >(handleUpdateVehicleChecklist, defaultState);

  const [checklistFiles, setChecklistFiles] = useState<Record<string, File[]>>(
    {},
  );
  const [fileErrors, setFileErrors] = useState<Record<string, string | null>>(
    {},
  );

  const [photosToRemove, setPhotosToRemove] = useState<string[]>([]);

  const {
    formRef,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    handleBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleDriverStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    isEntityDirty,
    checklistFormValues,
    handleFormValuesChange,
  } = useUpdateVehicleChecklistForm({
    state,
    handleCloseUpdateChecklist,
    checklistData,
    isUpdateChecklistOpen,
  });

  const updateVehicleChecklistForm = (vehicleChecklistFormData: FormData) => {
    // Ensure mileage is sent unformatted
    const mileageInput = document.querySelector(
      'input[name="current_mileage"]',
    ) as HTMLInputElement;

    if (mileageInput && mileageInput.value.includes(".")) {
      const numericValue = mileageInput.value.replace(/\./g, "");
      mileageInput.value = numericValue;

      vehicleChecklistFormData.set("current_mileage", numericValue);
    }

    const updateVehicleChacklistData = {
      checklistId: checklistData.id,
      businessId: checklistData.businessId,
      branchId: commandBranchInputValue.branchId,
      vehicleId: commandVehicleInputValue.vehicleId,
      driverId: commandDriverInputValue.driverId,
    };

    // Add files to FormData
    Object.entries(checklistFiles).forEach(([fieldName, files]) => {
      files.forEach((file) => {
        vehicleChecklistFormData.append(fieldName, file);
      });
    });

    // Add photos to remove
    if (photosToRemove.length > 0) {
      vehicleChecklistFormData.append(
        "photosToRemove",
        JSON.stringify(photosToRemove),
      );
    }

    // Frontend validation as additional layer
    // Extract current form values for validation
    const currentFormValues: Record<string, any> = {};
    for (const [key, value] of vehicleChecklistFormData.entries()) {
      if (
        typeof value === "string" &&
        key !== "checklistId" &&
        key !== "businessId" &&
        key !== "photosToRemove"
      ) {
        if (value === "true") {
          currentFormValues[key] = true;
        } else if (value === "false") {
          currentFormValues[key] = false;
        } else if (value.trim() !== "") {
          currentFormValues[key] = value;
        }
      }
    }

    // Validate photo requirements for update
    const photoValidation = validateUpdatePhotoRequirements(
      currentFormValues,
      checklistFiles,
      checklistData.photos || [],
      photosToRemove,
    );

    if (!photoValidation.isValid) {
      // Map field names to Portuguese labels
      const fieldLabels: Record<string, string> = {
        current_mileage: "Quilometragem Atual",
        fuel_level_adequate: "Nível de Combustível",
        tires_condition: "Condição dos Pneus",
        brakes_working: "Freios Funcionando",
        headlights_working: "Faróis Funcionando",
        taillights_working: "Lanternas Traseiras Funcionando",
        turn_signals_working: "Setas Funcionando",
        steering_wheel_condition: "Condição do Volante",
        battery_condition: "Condição da Bateria",
        bumpers_condition: "Condição dos Para-choques",
        windshield_condition: "Condição do Para-brisa",
        mirrors_condition: "Condição dos Retrovisores",
        spare_tire_condition: "Condição do Estepe",
        oil_level_adequate: "Nível de Óleo",
        radiator_water_adequate: "Água do Radiador",
        brake_fluid_adequate: "Fluido de Freio",
        seatbelts_working: "Cintos de Segurança",
        dashboard_working: "Painel Funcionando",
        clutch_working: "Embreagem Funcionando",
      };

      const missingPhotoLabels = photoValidation.missingPhotos.map(
        (field) => fieldLabels[field] || field,
      );

      toast.info(`Foto obrigatória faltando: ${missingPhotoLabels.join(", ")}`);
      return; // Prevent form submission
    }

    appendDataToForm(vehicleChecklistFormData, updateVehicleChacklistData);
    return dispatch(vehicleChecklistFormData);
  };

  return (
    <Dialog
      open={isUpdateChecklistOpen}
      onOpenChange={() => {
        if (isUpdateChecklistOpen) {
          formRef.current?.reset();
        }

        handleCloseUpdateChecklist();
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
                : "Editar Checklist Veicular"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para qual deseja atualizar o checklist."
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e motorista para o checklist."
                : "Atualize as informações necessárias do checklist veicular."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-branch" ? (
          <SelectBranchStep
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBranchStepContinue}
            commandBranchInputValue={commandBranchInputValue}
            errorBranchId={state?.updateVehicleChecklistError?.branchId}
            businessId={checklistData.businessId}
          />
        ) : currentStep === "select-vehicle-driver" ? (
          <SelectVehicleDriverStep
            businessId={checklistData.businessId}
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
            errorDriverId={state.updateVehicleChecklistError?.driverId}
            errorVehicleId={state.updateVehicleChecklistError?.vehicleId}
          />
        ) : (
          <form ref={formRef} action={updateVehicleChecklistForm}>
            <UpdateChecklistFormSubmit
              state={state}
              onBack={handleBackToVehicleDriverStep}
              checklistData={checklistData}
              isEntityDirty={isEntityDirty}
              initialFormValues={checklistFormValues}
              onFormValuesChange={handleFormValuesChange}
              commandBranchInputValue={commandBranchInputValue}
              commandVehicleInputValue={commandVehicleInputValue}
              commandDriverInputValue={commandDriverInputValue}
              checklistFiles={checklistFiles}
              setChecklistFiles={setChecklistFiles}
              fileErrors={fileErrors}
              setFileErrors={setFileErrors}
              photosToRemove={photosToRemove}
              setPhotosToRemove={setPhotosToRemove}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateVehicleChecklistForm };
