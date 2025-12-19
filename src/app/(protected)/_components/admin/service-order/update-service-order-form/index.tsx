import { useState, useEffect } from "react";
import { useFormState } from "react-dom";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { handleUpdateServiceOrder } from "@/actions/update-service-order";
import { useUpdateServiceOrderForm } from "./hooks";

import {
  UpdateServiceOrderFormState,
  UpdateServiceOrderFormProps,
} from "./dto";

import { UpdateServiceOrderFormSubmit } from "./update-service-order-form-submit";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

import { SelectUserStep } from "@/app/(protected)/_components/steps/select-user-step";
import { SelectBusinessBranchStep } from "@/app/(protected)/_components/steps/select-business-branch-step";

import { SelectVehicleSupplierStep } from "@/app/(protected)/_components/steps/select-vehicle-supplier-step";

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
    commandBusinessInputValue,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandSupplierInputValue,
    commandUserInputValue,
    handleBusinessStepContinue,
    handleVehicleSupplierStepContinue,
    handleUserStepContinue,
    handleBackToBusinessBranchStep,
    handleBackToVehicleSupplierStep,
    handleBackToUserStep,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchSupplierInputValue,
    handleUpdateSearchUserInputValue,
    isBusinessAndEntityDirty,
  } = useUpdateServiceOrderForm({
    state,
    handleCloseUpdateServiceOrder,
    serviceOrderData,
    isUpdateServiceOrderOpen,
  });

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
      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business-branch"
              ? "Selecionar Empresa e Filial"
              : currentStep === "select-vehicle-supplier"
                ? "Selecionar Veículo e Fornecedor"
                : currentStep === "select-user"
                  ? "Selecionar Usuário Responsável"
                  : "Atualizar Ordem de Serviço"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business-branch"
              ? "Selecione a empresa e filial para a qual deseja atualizar a ordem de serviço."
              : currentStep === "select-vehicle-supplier"
                ? "Selecione o veículo (obrigatório) e opcionalmente um fornecedor."
                : currentStep === "select-user"
                  ? "Selecione o usuário responsável pela ordem de serviço."
                  : "Atualize as informações solicitadas abaixo para concluir a atualização da ordem de serviço."}
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
            onContinue={handleBusinessStepContinue}
            commandBusinessInputValue={commandBusinessInputValue}
            commandBranchInputValue={commandBranchInputValue}
            errorBusinessId={state?.updateServiceOrderError?.businessId}
            errorBranchId={state?.updateServiceOrderError?.branchId}
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
            errorVehicleId={state?.updateServiceOrderError?.vehicleId}
            errorSupplierId={state?.updateServiceOrderError?.supplierId}
            searchSupplierIsOptional={true}
          />
        ) : currentStep === "select-user" ? (
          <SelectUserStep
            businessId={commandBusinessInputValue.businessId}
            commandUserInputValue={commandUserInputValue}
            handleUpdateSearchUserInputValue={handleUpdateSearchUserInputValue}
            onContinue={handleUserStepContinue}
            onBack={handleBackToVehicleSupplierStep}
            errorUserId={state?.updateServiceOrderError?.responsibleUserId}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              const extraData = {
                serviceOrderId: serviceOrderData.id,
                businessId: commandBusinessInputValue.businessId,
                branchId: commandBranchInputValue.branchId,
                vehicleId: commandVehicleInputValue.vehicleId,
                supplierId: commandSupplierInputValue.supplierId,
                responsibleUserId: commandUserInputValue.userId,
              };

              // 📍 GEOLOCATION: Handle latitude/longitude separately to support null values
              // When null, send as empty string (backend will convert to null)
              if (latitude === null) {
                formData.append("latitude", "");
              } else if (latitude !== undefined) {
                formData.append("latitude", latitude.toString());
              }

              if (longitude === null) {
                formData.append("longitude", "");
              } else if (longitude !== undefined) {
                formData.append("longitude", longitude.toString());
              }

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <UpdateServiceOrderFormSubmit
              state={state}
              onBack={handleBackToUserStep}
              serviceOrderData={serviceOrderData}
              isBusinessAndEntityDirty={isBusinessAndEntityDirty}
              isUpdateServiceOrderOpen={isUpdateServiceOrderOpen}
              commandVehicleInputValue={commandVehicleInputValue}
              commandBusinessInputValue={commandBusinessInputValue}
              handleLocationChange={handleLocationChange}
              handleLocationLoadingChange={handleLocationLoadingChange}
              latitude={latitude}
              longitude={longitude}
              isLoadingLocation={isLoadingLocation}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateServiceOrderForm };
