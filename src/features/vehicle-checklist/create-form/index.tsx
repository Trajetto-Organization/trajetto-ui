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

import type {
  ChecklistFormScope,
  CreateVehicleChecklistFormState,
} from "./types";
import { handleCreateVehicleChecklist } from "@/actions/vehicle-checklist/create-vehicle-checklist";

import { useCreateVehicleChecklistForm } from "./hooks";

import { appendDataToForm } from "@/lib/append-data-form";
import { usePhotoUpload } from "@/hooks/use-photo-upload";

import { MAX_CHECKLIST_TOTAL_BYTES } from "@/lib/upload-limits";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { SelectBusinessBranchStep } from "@/app/(protected)/_components/shared/steps/select-business-branch-step";
import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";

import { SelectVehicleDriverStep } from "@/app/(protected)/_components/shared/steps/select-vehicle-driver-step";
import { CreateVehicleChecklistFormSubmit } from "./submit";

/**
 * The one checklist creation wizard, for both routes.
 *
 * Scope decides the first step: a MASTER picks company and branch, a business
 * user starts from their own company and picks only the branch. Everything
 * after that — vehicle/driver selection and the form itself — is identical,
 * which is why the admin/dashboard twins could become this single component.
 */
const CreateVehicleChecklistForm = ({
  scope,
}: {
  scope: ChecklistFormScope;
}): JSX.Element => {
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

  // A MASTER resolves the company inside the wizard; a business user brought
  // theirs in through the scope.
  const businessId =
    scope.kind === "business"
      ? scope.businessId
      : commandBusinessInputValue.businessId;

  // Business users open this behind granular permissions; a MASTER is not
  // subject to them. The hook runs unconditionally (rules of hooks), the
  // gate applies only where it means something.
  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.VEHICLE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
    {
      key: permissions.VEHICLE_CHECKLIST_MANAGE,
      action: "write",
      label: getPermissionName(permissions.VEHICLE_CHECKLIST_MANAGE),
    },
    {
      key: permissions.BRANCH_MANAGE,
      action: "read",
      label: getPermissionName(permissions.BRANCH_MANAGE),
    },
    {
      key: permissions.DRIVER_MANAGE,
      action: "read",
      label: getPermissionName(permissions.DRIVER_MANAGE),
    },
  ]);

  const isTriggerBlocked =
    scope.kind === "business" && !permissionsRequired.hasAllPermissions;

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
      businessId,
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
      businessId,
    });

    // Upload failed and the error is already on screen.
    if (!photos) return;

    vehicleChecklistFormData.set("photos", JSON.stringify(photos));

    appendDataToForm(vehicleChecklistFormData, vehicleChecklistData);
    return dispatch(vehicleChecklistFormData);
  };

  const scopeStepTitle =
    scope.kind === "master" ? "Selecionar Empresa e Filial" : "Selecionar Filial";

  const scopeStepDescription =
    scope.kind === "master"
      ? "Selecione a empresa e filial para a qual deseja criar um checklist."
      : "Selecione a filial para a qual deseja criar um checklist.";

  return (
    <Dialog
      open={isCreateVehicleChecklistForm}
      onOpenChange={handleCloseDialog}
    >
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild data-tutorial="create-button">
            <div>
              <DialogTrigger asChild disabled={isTriggerBlocked}>
                <Button
                  size="sm"
                  className="h-8 w-full"
                  disabled={isTriggerBlocked}
                >
                  Criar Checklist
                </Button>
              </DialogTrigger>
            </div>
          </TooltipTrigger>
          {isTriggerBlocked && (
            <TooltipContent className="max-w-sm">
              <p>{permissionsRequired.tooltipMessage}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business-branch"
              ? scopeStepTitle
              : currentStep === "select-vehicle-driver"
                ? "Selecionar Veículo e Motorista"
                : "Criar Novo Checklist Veicular"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business-branch"
              ? scopeStepDescription
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e motorista para o checklist."
                : "Preencha as informações do checklist veicular abaixo."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business-branch" ? (
          scope.kind === "master" ? (
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
          ) : (
            <SelectBranchStep
              businessId={businessId}
              handleUpdateSearchBranchInputValue={
                handleUpdateSearchBranchInputValue
              }
              onContinue={handleBusinessBranchStepContinue}
              commandBranchInputValue={commandBranchInputValue}
              errorBranchId={state.createVehicleChecklistError?.branchId}
            />
          )
        ) : currentStep === "select-vehicle-driver" ? (
          <SelectVehicleDriverStep
            businessId={businessId}
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
              businessId={businessId}
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
