import { useState } from "react";

import { useFormState } from "react-dom";
import { X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import { handleUpdateVehicleChecklist } from "@/actions/update-vehicle-checklist";

import { useUpdateVehicleChecklistForm } from "./hooks";
import { cn } from "@/lib/utils";

import { SearchBusiness } from "../../../search-business";
import { SearchBranch } from "../../../search-branch";

import { SearchVehicle } from "../../../search-vehicle";
import { SearchDriver } from "../../../search-driver";

import {
  UpdateVehicleChecklistFormState,
  SelectBusinessBranchStepProps,
  UpdateVehicleChecklistFormProps,
  SelectVehicleDriverStepProps,
} from "./dto";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";
import { UpdateChecklistContainer } from "./components/update-checklist-container";

import { validateUpdatePhotoRequirements } from "../create-vehicle-checklist-form/utils/photo-requirements";

import { toast } from "sonner";

// Step 1: Select Business and Branch
const SelectBusinessBranchStep = ({
  state,
  handleUpdateSearchBusinessInputValue,
  handleUpdateSearchBranchInputValue,
  commandBusinessInputValue: { searchBusinessInputValue, businessId },
  commandBranchInputValue: { searchBranchInputValue, branchId },
  onContinue,
}: SelectBusinessBranchStepProps) => {
  return (
    <div className="space-y-6">
      {(searchBranchInputValue || searchBusinessInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {searchBusinessInputValue && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Empresa:</span>
                <span className="w-full truncate">
                  {searchBusinessInputValue}
                </span>
              </div>

              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchBusinessInputValue({
                    businessId: "",
                    searchBusinessInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}

          {searchBranchInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Filial:</span>
                <span className="w-full truncate">
                  {searchBranchInputValue}
                </span>
              </div>

              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchBranchInputValue({
                    branchId: "",
                    searchBranchInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}
        </div>
      )}

      <div
        className={`grid ${
          searchBusinessInputValue
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1"
        } gap-4`}
      >
        <SearchBusiness
          handleUpdateSearchBussinessInputValue={
            handleUpdateSearchBusinessInputValue
          }
          searchBusinessInputValue={searchBusinessInputValue}
          errorBusinessId={state.updateVehicleChecklistError?.businessId}
        />

        {searchBusinessInputValue && (
          <SearchBranch
            errorBranchId={state.updateVehicleChecklistError?.branchId}
            searchBranchInputValue={searchBranchInputValue}
            businessId={businessId}
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
          />
        )}
      </div>

      <div className="flex justify-end mt-6">
        <Button
          type="button"
          onClick={onContinue}
          disabled={!searchBusinessInputValue || !branchId}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 2: Select Vehicle and Driver
const SelectVehicleDriverStep = ({
  state,
  businessId,
  commandVehicleInputValue,
  commandDriverInputValue,
  handleUpdateSearchVehicleInputValue,
  handleUpdateSearchDriverInputValue,
  onContinue,
  onBack,
}: SelectVehicleDriverStepProps) => {
  return (
    <div className="space-y-6">
      {/* Show selected vehicle and driver if any */}
      {(commandVehicleInputValue.searchVehicleInputValue ||
        commandDriverInputValue.searchDriverInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {/* Display selected Vehicle if any */}
          {commandVehicleInputValue.searchVehicleInputValue && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Veículo:</span>
                <span className="w-full truncate">
                  {commandVehicleInputValue.searchVehicleInputValue}{" "}
                  {commandVehicleInputValue.vehicleLicensePlate && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Placa: {commandVehicleInputValue.vehicleLicensePlate})
                    </span>
                  )}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchVehicleInputValue({
                    vehicleId: "",
                    searchVehicleInputValue: "",
                    vehicleLicensePlate: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}

          {/* Display selected Driver if any */}
          {commandDriverInputValue.searchDriverInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Motorista:</span>
                <span className="w-full truncate">
                  {commandDriverInputValue.searchDriverInputValue}{" "}
                  {commandDriverInputValue.driverCnh && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (CNH: {commandDriverInputValue.driverCnh})
                    </span>
                  )}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchDriverInputValue({
                    driverId: "",
                    searchDriverInputValue: "",
                    driverCnh: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vehicle Selection (Required) */}
        <div>
          <SearchVehicle
            errorVehicleId={state.updateVehicleChecklistError?.vehicleId}
            selectedVehicleId={commandVehicleInputValue.vehicleId}
            businessId={businessId}
            handleUpdateSearchVehicleInputValue={
              handleUpdateSearchVehicleInputValue
            }
          />
        </div>

        {/* Driver Selection (Required) */}
        <div>
          <SearchDriver
            errorDriverId={state.updateVehicleChecklistError?.driverId}
            selectedDriverId={commandDriverInputValue.driverId}
            businessId={businessId}
            handleUpdateSearchDriverInputValue={
              handleUpdateSearchDriverInputValue
            }
          />
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={
            !commandVehicleInputValue.vehicleId ||
            !commandDriverInputValue.driverId
          }
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

const UpdateVehicleChecklistForm = ({
  checklistData,
  handleCloseUpdateChecklist,
  isUpdateChecklistOpen,
}: UpdateVehicleChecklistFormProps): JSX.Element => {
  const defaultState: UpdateVehicleChecklistFormState = {};
  const [state, dispatch] = useFormState(handleUpdateVehicleChecklist, null);

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
    commandBusinessInputValue,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    handleBusinessBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleBackToBusinessBranchStep,
    handleBackToVehicleDriverStep,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    isBusinessAndEntityDirty,
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
            {currentStep === "select-business-branch"
              ? "Selecionar Empresa e Filial"
              : currentStep === "select-vehicle-driver"
                ? "Selecionar Veículo e Motorista"
                : "Atualizar Checklist Veicular"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business-branch"
              ? "Selecione a empresa e filial para a qual deseja atualizar o checklist."
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e motorista para o checklist."
                : "Atualize as informações necessárias do checklist veicular."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business-branch" ? (
          <SelectBusinessBranchStep
            state={state ?? defaultState}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBusinessBranchStepContinue}
            commandBusinessInputValue={commandBusinessInputValue}
            commandBranchInputValue={commandBranchInputValue}
          />
        ) : currentStep === "select-vehicle-driver" ? (
          <SelectVehicleDriverStep
            state={state ?? defaultState}
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
                businessId: commandBusinessInputValue.businessId,
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
            <UpdateChecklistContainer
              state={state ?? defaultState}
              onBack={handleBackToVehicleDriverStep}
              checklistData={checklistData}
              isBusinessAndEntityDirty={isBusinessAndEntityDirty}
              isUpdateChecklistOpen={isUpdateChecklistOpen}
              commandBusinessInputValue={commandBusinessInputValue}
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
