import { useState, useEffect } from "react";
import { useFormState } from "react-dom";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { handleUpdateServiceOrder } from "@/actions/service-order/update-service-order";
import { useUpdateServiceOrderForm } from "./hooks";

import type {
  UpdateServiceOrderFormState,
  UpdateServiceOrderFormProps,
} from "./update-service-order-form.types";

import { UpdateServiceOrderFormSubmit } from "./update-service-order-form-submit";
import { appendDataToForm } from "@/lib/append-data-form";

import { SelectUserStep } from "@/app/(protected)/_components/shared/steps/select-user-step";
import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";

import { SelectVehicleSupplierStep } from "@/app/(protected)/_components/shared/steps/select-vehicle-supplier-step";

const UpdateServiceOrderForm = ({
  serviceOrderData,
  handleCloseUpdateServiceOrder,
  isUpdateServiceOrderOpen,
}: UpdateServiceOrderFormProps): JSX.Element => {
  const defaultState: UpdateServiceOrderFormState = {};
  const [state, dispatch] = useFormState<UpdateServiceOrderFormState, FormData>(
    handleUpdateServiceOrder,
    defaultState,
  );

  // 📍 GEOLOCATION STATE - Initialize with existing serviceOrderData location
  const [latitude, setLatitude] = useState<number | null>(
    serviceOrderData.latitude ?? null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    serviceOrderData.longitude ?? null,
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  const handleLocationChange = (lat: number, lon: number) => {
    setLatitude(lat);
    setLongitude(lon);
  };

  const handleLocationLoadingChange = (isLoading: boolean) => {
    setIsLoadingLocation(isLoading);
  };

  // Reset location state when serviceOrderData changes
  useEffect(() => {
    if (isUpdateServiceOrderOpen) {
      setLatitude(serviceOrderData.latitude ?? null);
      setLongitude(serviceOrderData.longitude ?? null);

      setIsLoadingLocation(false);
    }
  }, [serviceOrderData, isUpdateServiceOrderOpen]);

  const {
    formRef,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandSupplierInputValue,
    commandUserInputValue,
    handleBranchStepContinue,
    handleVehicleSupplierStepContinue,
    handleUserStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleSupplierStep,
    handleBackToUserStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchSupplierInputValue,
    handleUpdateSearchUserInputValue,
    isEntityDirty,
    serviceOrderFormValues,
    handleFormValuesChange,
  } = useUpdateServiceOrderForm({
    state,
    handleCloseUpdateServiceOrder,
    serviceOrderData,
    isUpdateServiceOrderOpen,
  });

  const updateServiceOrderForm = (serviceOrderFormData: FormData) => {
    const updateServiceOrderData = {
      serviceOrderId: serviceOrderData.id,
      businessId: serviceOrderData.businessId,
      branchId: commandBranchInputValue.branchId,
      vehicleId: commandVehicleInputValue.vehicleId,
      supplierId: commandSupplierInputValue.supplierId,
      responsibleUserId: commandUserInputValue.userId,
    };

    // 📍 GEOLOCATION: Handle latitude/longitude separately to support null values
    // When null, send as empty string (backend will convert to null)
    if (latitude === null) {
      serviceOrderFormData.append("latitude", "");
    } else if (latitude !== undefined) {
      serviceOrderFormData.append("latitude", latitude.toString());
    }

    if (longitude === null) {
      serviceOrderFormData.append("longitude", "");
    } else if (longitude !== undefined) {
      serviceOrderFormData.append("longitude", longitude.toString());
    }

    appendDataToForm(serviceOrderFormData, updateServiceOrderData);
    return dispatch(serviceOrderFormData);
  };

  return (
    <Dialog
      open={isUpdateServiceOrderOpen}
      onOpenChange={() => {
        if (isUpdateServiceOrderOpen) {
          formRef.current?.reset();
        }

        handleCloseUpdateServiceOrder();
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
              : currentStep === "select-vehicle-supplier"
                ? "Selecionar Veículo e Fornecedor"
                : currentStep === "select-user"
                  ? "Selecionar Usuário Responsável"
                  : "Editar Ordem de Serviço"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para qual deseja atualizar a ordem de serviço."
              : currentStep === "select-vehicle-supplier"
                ? "Selecione o veículo (obrigatório) e opcionalmente um fornecedor."
                : currentStep === "select-user"
                  ? "Selecione o usuário responsável pela ordem de serviço."
                  : "Atualize as informações solicitadas abaixo para concluir a atualização da ordem de serviço."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-branch" ? (
          <SelectBranchStep
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBranchStepContinue}
            commandBranchInputValue={commandBranchInputValue}
            errorBranchId={state?.updateServiceOrderError?.branchId}
            businessId={serviceOrderData.businessId}
          />
        ) : currentStep === "select-vehicle-supplier" ? (
          <SelectVehicleSupplierStep
            businessId={serviceOrderData.businessId}
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
            errorVehicleId={state?.updateServiceOrderError?.vehicleId}
            errorSupplierId={state?.updateServiceOrderError?.supplierId}
            searchSupplierIsOptional={true}
          />
        ) : currentStep === "select-user" ? (
          <SelectUserStep
            businessId={serviceOrderData.businessId}
            commandUserInputValue={commandUserInputValue}
            handleUpdateSearchUserInputValue={handleUpdateSearchUserInputValue}
            onContinue={handleUserStepContinue}
            onBack={handleBackToVehicleSupplierStep}
            errorUserId={state?.updateServiceOrderError?.responsibleUserId}
          />
        ) : (
          <form ref={formRef} action={updateServiceOrderForm}>
            <UpdateServiceOrderFormSubmit
              state={state}
              onBack={handleBackToUserStep}
              serviceOrderData={serviceOrderData}
              isEntityDirty={isEntityDirty}
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

export { UpdateServiceOrderForm };
