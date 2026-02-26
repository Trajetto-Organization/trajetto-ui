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
import { DashboardCreateVehicleChecklistFormState } from "./dto";

import { Button } from "@/components/ui/button";
import { handleCreateVehicleChecklist } from "@/actions/vehicle-checklist/create-vehicle-checklist";

import { useDashboardCreateVehicleChecklistForm } from "./hooks";
import { appendDataToForm } from "@/lib/append-data-form";

import { useAuthStore } from "@/store/auth-store";
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

import { DashboardCreateVehicleChecklistFormSubmit } from "./dashboard-create-vehicle-checklist-form-submit";

import { SelectBranchStep } from "@/app/(protected)/_components/steps/select-branch-step";
import { SelectVehicleDriverStep } from "@/app/(protected)/_components/steps/select-vehicle-driver-step";

const DashboardCreateVehicleChecklistForm = (): JSX.Element => {
  const defaultState: DashboardCreateVehicleChecklistFormState = {};
  const [state, dispatch] = useFormState<
    DashboardCreateVehicleChecklistFormState,
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
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleDriverStep,
    checklistFormValues,
    handleFormValuesChange,
  } = useDashboardCreateVehicleChecklistForm(state);

  const { businessId } = useAuthStore();
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

  // Reset file states when modal closes or on success
  useEffect(() => {
    if (!isCreateVehicleChecklistForm) {
      setChecklistFiles({});
      setFileErrors({});
    }
  }, [isCreateVehicleChecklistForm]);

  // Reset file states on successful creation
  useEffect(() => {
    if (state?.successMessage) {
      setChecklistFiles({});
      setFileErrors({});
    }
  }, [state?.successMessage]);

  const createVehicleChecklistForm = (vehicleChecklistFormData: FormData) => {
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
      businessId: businessId as string,
      branchId: commandBranchInputValue.branchId,
      vehicleId: commandVehicleInputValue.vehicleId,
      driverId: commandDriverInputValue.driverId,
    };

    // Add all checklist files to FormData with renamed files
    Object.entries(checklistFiles).forEach(([fieldName, files]) => {
      files.forEach((file, index) => {
        // Create new file with mobile-like naming pattern: fieldName_timestamp_index.extension
        const fileExtension = file.name.split(".").pop() || "jpg";
        const newFileName = `${fieldName}_${Date.now()}_${index}.${fileExtension}`;

        // Create a new File object with the new name
        const renamedFile = new File([file], newFileName, {
          type: file.type,
        });

        vehicleChecklistFormData.append(fieldName, renamedFile);
      });
    });

    appendDataToForm(vehicleChecklistFormData, vehicleChecklistData);
    return dispatch(vehicleChecklistFormData);
  };

  return (
    <Dialog
      open={isCreateVehicleChecklistForm}
      onOpenChange={handleCloseDialog}
    >
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild data-tutorial="create-button">
            <div>
              <DialogTrigger
                asChild
                disabled={!permissionsRequired.hasAllPermissions}
              >
                <Button
                  size="sm"
                  className="h-8 w-full"
                  disabled={!permissionsRequired.hasAllPermissions}
                >
                  Criar Checklist
                </Button>
              </DialogTrigger>
            </div>
          </TooltipTrigger>
          {!permissionsRequired.hasAllPermissions && (
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
            {currentStep === "select-branch"
              ? "Selecionar Filial"
              : currentStep === "select-vehicle-driver"
                ? "Selecionar Veículo e Motorista"
                : "Criar Novo Checklist Veicular"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para a qual deseja criar um checklist."
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e motorista para o checklist."
                : "Preencha as informações do checklist veicular abaixo."}
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
            errorBranchId={state.createVehicleChecklistError?.branchId}
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
            errorDriverId={state.createVehicleChecklistError?.driverId}
            errorVehicleId={state.createVehicleChecklistError?.vehicleId}
          />
        ) : (
          <form ref={formRef} action={createVehicleChecklistForm}>
            <DashboardCreateVehicleChecklistFormSubmit
              state={state}
              onBack={handleBackToVehicleDriverStep}
              commandBranchInputValue={commandBranchInputValue}
              commandVehicleInputValue={commandVehicleInputValue}
              businessId={businessId as string}
              checklistFiles={checklistFiles}
              setChecklistFiles={setChecklistFiles}
              fileErrors={fileErrors}
              setFileErrors={setFileErrors}
              initialFormValues={checklistFormValues}
              onFormValuesChange={handleFormValuesChange}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreateVehicleChecklistForm };
