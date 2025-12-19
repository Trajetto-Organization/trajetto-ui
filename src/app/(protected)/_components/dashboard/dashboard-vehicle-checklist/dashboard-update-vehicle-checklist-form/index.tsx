import { useState } from "react";
import { useFormState } from "react-dom";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { handleUpdateVehicleChecklist } from "@/actions/update-vehicle-checklist";
import { useUpdateVehicleChecklistForm } from "./hooks";

import {
  DashboardUpdateVehicleChecklistFormState,
  DashboardUpdateVehicleChecklistFormProps,
} from "./dto";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";
import { DashboardUpdateChecklistFormSubmit } from "./dashboard-update-vehicle-checklist-form-submit";

import { validateUpdatePhotoRequirements } from "../dashboard-create-vehicle-checklist-form/utils/photo-requirements";

import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";

import { SelectBranchStep } from "@/app/(protected)/_components/steps/select-branch-step";
import { SelectVehicleDriverStep } from "@/app/(protected)/_components/steps/select-vehicle-driver-step";

const DashboardUpdateVehicleChecklistForm = ({
  checklistData,
  handleCloseUpdateChecklist,
  isUpdateChecklistOpen,
}: DashboardUpdateVehicleChecklistFormProps): JSX.Element => {
  const { businessId } = useAuthStore();

  const defaultState: DashboardUpdateVehicleChecklistFormState = {};
  const [state, dispatch] = useFormState<
    DashboardUpdateVehicleChecklistFormState,
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
  } = useUpdateVehicleChecklistForm({
    state,
    handleCloseUpdateChecklist,
    checklistData,
    isUpdateChecklistOpen,
  });

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
      <DialogScrollContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-branch"
              ? "Selecionar Filial"
              : currentStep === "select-vehicle-driver"
                ? "Selecionar Veículo e Motorista"
                : "Atualizar Checklist Veicular"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para a qual deseja atualizar o checklist."
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e motorista para o checklist."
                : "Atualize as informações necessárias do checklist veicular."}
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
            errorBranchId={state.updateVehicleChecklistError?.branchId}
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
            errorDriverId={state.updateVehicleChecklistError?.driverId}
            errorVehicleId={state.updateVehicleChecklistError?.vehicleId}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              // Ensure mileage is sent unformatted
              const mileageInput = document.querySelector(
                'input[name="current_mileage"]',
              ) as HTMLInputElement;
              if (mileageInput && mileageInput.value.includes(".")) {
                const numericValue = mileageInput.value.replace(/\./g, "");
                mileageInput.value = numericValue;

                formData.set("current_mileage", numericValue);
              }

              const extraData = {
                checklistId: checklistData.id,
                businessId: businessId as string,
                branchId: commandBranchInputValue.branchId,
                vehicleId: commandVehicleInputValue.vehicleId,
                driverId: commandDriverInputValue.driverId,
              };

              // Add files to FormData
              Object.entries(checklistFiles).forEach(([fieldName, files]) => {
                files.forEach((file) => {
                  formData.append(fieldName, file);
                });
              });

              // Add photos to remove
              if (photosToRemove.length > 0) {
                formData.append(
                  "photosToRemove",
                  JSON.stringify(photosToRemove),
                );
              }

              // Frontend validation as additional layer
              // Extract current form values for validation
              const currentFormValues: Record<string, any> = {};
              for (const [key, value] of formData.entries()) {
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

                toast.info(
                  `Foto obrigatória faltando: ${missingPhotoLabels.join(", ")}`,
                );
                return; // Prevent form submission
              }

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <DashboardUpdateChecklistFormSubmit
              state={state}
              onBack={handleBackToVehicleDriverStep}
              checklistData={checklistData}
              isEntityDirty={isEntityDirty}
              isUpdateChecklistOpen={isUpdateChecklistOpen}
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

export { DashboardUpdateVehicleChecklistForm };
