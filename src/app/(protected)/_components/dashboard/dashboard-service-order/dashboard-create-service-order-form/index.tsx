import { useEffect, useState } from "react";
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
import type { DashboardCreateServiceOrderFormState } from "./dashboard-create-service-order-form.types";

import { handleCreateServiceOrder } from "@/actions/service-order/create-service-order";
import { useDashboardCreateServiceOrderForm } from "./hooks";

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

import { appendDataToForm } from "@/lib/append-data-form";
import { DashboardCreateServiceOrderFormSubmit } from "./dashboard-create-service-order-form-submit";

import { SelectUserStep } from "@/app/(protected)/_components/shared/steps/select-user-step";

import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";
import { SelectVehicleSupplierStep } from "@/app/(protected)/_components/shared/steps/select-vehicle-supplier-step";

const DashboardCreateServiceOrderForm = (): JSX.Element => {
  const defaultState: DashboardCreateServiceOrderFormState = {};
  const [state, dispatch] = useFormState<
    DashboardCreateServiceOrderFormState,
    FormData
  >(handleCreateServiceOrder, defaultState);

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
    isCreateServiceOrderForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandSupplierInputValue,
    commandUserInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchSupplierInputValue,
    handleUpdateSearchUserInputValue,
    handleBusinessBranchStepContinue,
    handleVehicleSupplierStepContinue,
    handleUserStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleSupplierStep,
    handleBackToUserStep,
    serviceOrderFormValues,
    handleFormValuesChange,
  } = useDashboardCreateServiceOrderForm(state);

  const { businessId } = useAuthStore();
  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.SERVICE_ORDER_MANAGE,
      action: "write",
      label: getPermissionName(permissions.SERVICE_ORDER_MANAGE),
    },
    {
      key: permissions.BRANCH_MANAGE,
      action: "read",
      label: getPermissionName(permissions.BRANCH_MANAGE),
    },
    {
      key: permissions.VEHICLE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
    {
      key: permissions.USER_REGISTRATION_MANAGE,
      action: "read",
      label: getPermissionName(permissions.USER_REGISTRATION_MANAGE),
    },
  ]);

  // Reset location states when modal closes or on success
  useEffect(() => {
    if (!isCreateServiceOrderForm) {
      setLatitude(null);
      setLongitude(null);

      setIsLoadingLocation(false);
    }
  }, [isCreateServiceOrderForm]);

  // Reset location states on successful creation
  useEffect(() => {
    if (state?.successMessage) {
      setLatitude(null);
      setLongitude(null);

      setIsLoadingLocation(false);
    }
  }, [state?.successMessage]);

  const createServiceOrderForm = (serviceOrderFormData: FormData) => {
    const serviceOrderData = {
      businessId: businessId as string,
      branchId: commandBranchInputValue.branchId,
      vehicleId: commandVehicleInputValue.vehicleId,
      responsibleUserId: commandUserInputValue.userId,
      latitude: latitude?.toString() as string,
      longitude: longitude?.toString() as string,
    };

    if (commandSupplierInputValue.supplierId) {
      serviceOrderFormData.append(
        "supplierId",
        commandSupplierInputValue.supplierId,
      );
    }

    appendDataToForm(serviceOrderFormData, serviceOrderData);
    return dispatch(serviceOrderFormData);
  };

  return (
    <Dialog open={isCreateServiceOrderForm} onOpenChange={handleCloseDialog}>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <DialogTrigger
                asChild
                disabled={!permissionsRequired.hasAllPermissions}
                data-tutorial="create-button"
              >
                <Button
                  size="sm"
                  className="h-8 w-full"
                  disabled={!permissionsRequired.hasAllPermissions}
                >
                  Criar Ordem de Serviço
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
              : currentStep === "select-vehicle-supplier"
                ? "Selecionar Veículo e Fornecedor"
                : currentStep === "select-user"
                  ? "Selecionar Usuário Responsável"
                  : "Criar Nova Ordem de Serviço"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para a qual deseja criar uma ordem de serviço."
              : currentStep === "select-vehicle-supplier"
                ? "Selecione o veículo (obrigatório) e opcionalmente um fornecedor."
                : currentStep === "select-user"
                  ? "Selecione o usuário responsável pela ordem de serviço."
                  : "Insira as informações solicitadas abaixo para concluir a criação da ordem de serviço."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-branch" ? (
          <SelectBranchStep
            businessId={businessId as string}
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBusinessBranchStepContinue}
            commandBranchInputValue={commandBranchInputValue}
            errorBranchId={state.createServiceOrderError?.branchId}
          />
        ) : currentStep === "select-vehicle-supplier" ? (
          <SelectVehicleSupplierStep
            businessId={businessId as string}
            commandVehicleInputValue={commandVehicleInputValue}
            commandSupplierInputValue={commandSupplierInputValue}
            handleUpdateSearchVehicleInputValue={
              handleUpdateSearchVehicleInputValue
            }
            handleUpdateSearchSupplierInputValue={
              handleUpdateSearchSupplierInputValue
            }
            onContinue={handleVehicleSupplierStepContinue}
            onBack={handleBackToBranchStep}
            errorSupplierId={state.createServiceOrderError?.supplierId}
            errorVehicleId={state.createServiceOrderError?.vehicleId}
            searchSupplierIsOptional={true}
          />
        ) : currentStep === "select-user" ? (
          <SelectUserStep
            businessId={businessId as string}
            commandUserInputValue={commandUserInputValue}
            handleUpdateSearchUserInputValue={handleUpdateSearchUserInputValue}
            onContinue={handleUserStepContinue}
            onBack={handleBackToVehicleSupplierStep}
            errorUserId={state?.createServiceOrderError?.responsibleUserId}
          />
        ) : (
          <form ref={formRef} action={createServiceOrderForm}>
            <DashboardCreateServiceOrderFormSubmit
              state={state}
              onBack={handleBackToUserStep}
              businessId={businessId as string}
              commandVehicleInputValue={commandVehicleInputValue}
              handleLocationChange={handleLocationChange}
              handleLocationLoadingChange={handleLocationLoadingChange}
              latitude={latitude}
              longitude={longitude}
              isLoadingLocation={isLoadingLocation}
              initialFormValues={serviceOrderFormValues}
              onFormValuesChange={handleFormValuesChange}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreateServiceOrderForm };
