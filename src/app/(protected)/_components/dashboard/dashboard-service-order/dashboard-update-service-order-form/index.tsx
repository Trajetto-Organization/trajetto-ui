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

import { useDashboardUpdateServiceOrderForm } from "./hooks";
import {
  DashboardUpdateServiceOrderFormState,
  DashboardUpdateServiceOrderFormProps,
} from "./dto";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";
import { useAuthStore } from "@/store/auth-store";

import { SelectUserStep } from "@/app/(protected)/_components/steps/select-user-step";

import { SelectBranchStep } from "@/app/(protected)/_components/steps/select-branch-step";
import { SelectVehicleSupplierStep } from "@/app/(protected)/_components/steps/select-vehicle-supplier-step";

import { DashboardUpdateServiceOrderFormSubmit } from "./dashboard-update-service-order-form-submit";

const DashboardUpdateServiceOrderForm = ({
  serviceOrderData,
  handleCloseUpdateServiceOrder,
  isUpdateServiceOrderOpen,
}: DashboardUpdateServiceOrderFormProps): JSX.Element => {
  const defaultState: DashboardUpdateServiceOrderFormState = {};
  const [state, dispatch] = useFormState<
    DashboardUpdateServiceOrderFormState,
    FormData
  >(handleUpdateServiceOrder, defaultState);

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
    handleBusinessStepContinue,
    handleVehicleSupplierStepContinue,
    handleUserStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleSupplierStep,
    handleBackToUserStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchSupplierInputValue,
    handleUpdateSearchUserInputValue,
    isBusinessAndEntityDirty,
  } = useDashboardUpdateServiceOrderForm({
    state,
    handleCloseUpdateServiceOrder,
    serviceOrderData,
    isUpdateServiceOrderOpen,
  });

  const { businessId } = useAuthStore();

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
            {currentStep === "select-branch"
              ? "Selecionar Filial"
              : currentStep === "select-vehicle-supplier"
                ? "Selecionar Veículo e Fornecedor"
                : currentStep === "select-user"
                  ? "Selecionar Usuário Responsável"
                  : "Atualizar Ordem de Serviço"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para a qual deseja atualizar a ordem de serviço."
              : currentStep === "select-vehicle-supplier"
                ? "Selecione o veículo (obrigatório) e opcionalmente um fornecedor."
                : currentStep === "select-user"
                  ? "Selecione o usuário responsável pela ordem de serviço."
                  : "Atualize as informações solicitadas abaixo para concluir a atualização da ordem de serviço."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-branch" ? (
          <SelectBranchStep
            businessId={businessId as string}
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBusinessStepContinue}
            commandBranchInputValue={commandBranchInputValue}
            errorBranchId={state.updateServiceOrderError?.branchId}
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
            errorSupplierId={state.updateServiceOrderError?.supplierId}
            errorVehicleId={state.updateServiceOrderError?.vehicleId}
            searchSupplierIsOptional={true}
          />
        ) : currentStep === "select-user" ? (
          <SelectUserStep
            businessId={businessId as string}
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
                businessId: businessId as string,
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
            <DashboardUpdateServiceOrderFormSubmit
              state={state}
              onBack={handleBackToUserStep}
              serviceOrderData={serviceOrderData}
              isBusinessAndEntityDirty={isBusinessAndEntityDirty}
              isUpdateServiceOrderOpen={isUpdateServiceOrderOpen}
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

export { DashboardUpdateServiceOrderForm };
