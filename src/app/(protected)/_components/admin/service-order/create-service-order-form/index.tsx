import { useEffect, useState } from "react";
import { useFormState } from "react-dom";

import type { CreateServiceOrderFormState } from "./create-service-order-form.types";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { handleCreateServiceOrder } from "@/actions/service-order/create-service-order";

import { useCreateServiceOrderForm } from "./hooks";
import { appendDataToForm } from "@/lib/append-data-form";

import { SelectUserStep } from "@/app/(protected)/_components/shared/steps/select-user-step";

import { SelectBusinessBranchStep } from "@/app/(protected)/_components/shared/steps/select-business-branch-step";
import { SelectVehicleSupplierStep } from "@/app/(protected)/_components/shared/steps/select-vehicle-supplier-step";

import { CreateServiceOrderFormSubmit } from "./create-service-order-form-submit";

const CreateServiceOrderForm = (): JSX.Element => {
  const defaultState: CreateServiceOrderFormState = {};
  const [state, dispatch] = useFormState<CreateServiceOrderFormState, FormData>(
    handleCreateServiceOrder,
    defaultState,
  );

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
    commandBusinessInputValue,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandSupplierInputValue,
    commandUserInputValue,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchSupplierInputValue,
    handleUpdateSearchUserInputValue,
    handleBusinessBranchStepContinue,
    handleVehicleSupplierStepContinue,
    handleUserStepContinue,
    handleBackToBusinessBranchStep,
    handleBackToVehicleSupplierStep,
    handleBackToUserStep,
    serviceOrderFormValues,
    handleFormValuesChange,
  } = useCreateServiceOrderForm(state);

  // Reset geolocation states when modal closes or on success
  useEffect(() => {
    if (!isCreateServiceOrderForm) {
      setLatitude(null);
      setLongitude(null);

      setIsLoadingLocation(false);
    }
  }, [isCreateServiceOrderForm]);

  // Reset geolocation states on successful creation
  useEffect(() => {
    if (state?.successMessage) {
      setLatitude(null);
      setLongitude(null);

      setIsLoadingLocation(false);
    }
  }, [state?.successMessage]);

  const createServiceOrderForm = (serviceOrderFormData: FormData) => {
    const serviceOrderData = {
      businessId: commandBusinessInputValue.businessId,
      branchId: commandBranchInputValue.branchId,
      vehicleId: commandVehicleInputValue.vehicleId,
      responsibleUserId: commandUserInputValue.userId,
      latitude: latitude?.toString() as string, // Send as string or null
      longitude: longitude?.toString() as string, // Send as string or null
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
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Ordem de Serviço
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
              : currentStep === "select-vehicle-supplier"
                ? "Selecionar Veículo e Fornecedor"
                : currentStep === "select-user"
                  ? "Selecionar Usuário Responsável"
                  : "Criar Nova Ordem de Serviço"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business-branch"
              ? "Selecione a empresa e filial para a qual deseja criar uma ordem de serviço."
              : currentStep === "select-vehicle-supplier"
                ? "Selecione o veículo (obrigatório) e opcionalmente um fornecedor."
                : currentStep === "select-user"
                  ? "Selecione o usuário responsável pela ordem de serviço."
                  : "Insira as informações solicitadas abaixo para concluir a criação da ordem de serviço."}
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
            errorBusinessId={state?.createServiceOrderError?.businessId}
            errorBranchId={state?.createServiceOrderError?.branchId}
          />
        ) : currentStep === "select-vehicle-supplier" ? (
          <SelectVehicleSupplierStep
            businessId={commandBusinessInputValue.businessId}
            commandVehicleInputValue={commandVehicleInputValue}
            commandSupplierInputValue={commandSupplierInputValue}
            handleUpdateSearchVehicleInputValue={
              handleUpdateSearchVehicleInputValue
            }
            handleUpdateSearchSupplierInputValue={
              handleUpdateSearchSupplierInputValue
            }
            onContinue={handleVehicleSupplierStepContinue}
            onBack={handleBackToBusinessBranchStep}
            errorVehicleId={state?.createServiceOrderError?.vehicleId}
            errorSupplierId={state?.createServiceOrderError?.supplierId}
            searchSupplierIsOptional={true}
          />
        ) : currentStep === "select-user" ? (
          <SelectUserStep
            businessId={commandBusinessInputValue.businessId}
            commandUserInputValue={commandUserInputValue}
            handleUpdateSearchUserInputValue={handleUpdateSearchUserInputValue}
            onContinue={handleUserStepContinue}
            onBack={handleBackToVehicleSupplierStep}
            errorUserId={state?.createServiceOrderError?.responsibleUserId}
          />
        ) : (
          <form ref={formRef} action={createServiceOrderForm}>
            <CreateServiceOrderFormSubmit
              state={state}
              onBack={handleBackToUserStep}
              commandBusinessInputValue={commandBusinessInputValue}
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

export { CreateServiceOrderForm };
