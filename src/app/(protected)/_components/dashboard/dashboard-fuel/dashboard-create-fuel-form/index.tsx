import { useState, useRef, useEffect } from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Info, Loader, X, Upload, Image as ImageIcon } from "lucide-react";

import { useDropzone } from "react-dropzone";
import dynamic from "next/dynamic";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  DashboardCreateFuelContainerProps,
  DashboardCreateFuelFormState,
  DashboardSelectBranchStepProps,
  DashboardSelectVehicleDriverStepProps,
  DashboardSelectFuelTypeStepProps,
} from "./dto";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateFuel } from "@/actions/create-fuel";

import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
  formatMileage,
  formatLiters,
  mileageToNumber,
  litersToNumber,
} from "@/lib/format-values";

import { DatePickerField } from "../../../custom";
import { SearchBranch } from "../../../search-branch";

import { SearchVehicle } from "../../../search-vehicle";
import { SearchDriver } from "../../../search-driver";

import { SearchFuelType } from "../../../search-fuel-type";
import { useDashboardCreateFuelForm } from "./hooks";

import { useAuthStore } from "@/store/auth-store";
import { permissions } from "@/lib/permissions";

import { cn } from "@/lib/utils";

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

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFetchVehicleData } from "../../../search-vehicle-by-id-business";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

// Dynamic import for LocationPicker (client-side only)
const LocationPicker = dynamic(
  () => import("../../../custom/location-picker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        Carregando mapa...
      </div>
    ),
  },
);

// Step 1: Select Branch
const DashboardSelectBranchStep = ({
  state,
  businessId,
  handleUpdateSearchBranchInputValue,
  commandBranchInputValue: { searchBranchInputValue, branchId },
  onContinue,
}: DashboardSelectBranchStepProps) => {
  return (
    <div className="space-y-6">
      {searchBranchInputValue && (
        <div className="grid grid-cols-1 gap-4 w-full">
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

      <div className={`grid grid-cols-1 gap-4`}>
        <SearchBranch
          errorBranchId={state.createFuelError?.branchId}
          searchBranchInputValue={searchBranchInputValue}
          businessId={businessId}
          handleUpdateSearchBranchInputValue={
            handleUpdateSearchBranchInputValue
          }
        />
      </div>

      <div className="flex justify-end mt-6">
        <Button type="button" onClick={onContinue} disabled={!branchId}>
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 2: Select Vehicle and Driver
const DashboardSelectVehicleDriverStep = ({
  state,
  businessId,
  commandVehicleInputValue,
  commandDriverInputValue,
  handleUpdateSearchVehicleInputValue,
  handleUpdateSearchDriverInputValue,
  onContinue,
  onBack,
}: DashboardSelectVehicleDriverStepProps) => {
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
            errorVehicleId={state.createFuelError?.vehicleId}
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
            errorDriverId={state.createFuelError?.driverId}
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

// Step 3: Select Fuel Type
const DashboardSelectFuelTypeStep = ({
  state,
  businessId,
  commandFuelTypeInputValue,
  handleUpdateSearchFuelTypeInputValue,
  onContinue,
  onBack,
}: DashboardSelectFuelTypeStepProps) => {
  return (
    <div className="space-y-6">
      {/* Show selected Fuel Type if any */}
      {commandFuelTypeInputValue.searchFuelTypeInputValue && (
        <div className="grid grid-cols-1 gap-4 w-full">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-dashed truncate h-8 text-left",
              )}
            >
              <span>Combustível:</span>
              <span className="w-full truncate">
                {commandFuelTypeInputValue.searchFuelTypeInputValue}
              </span>
            </div>
            <Button
              className="h-8 w-4"
              variant="ghost"
              onClick={() =>
                handleUpdateSearchFuelTypeInputValue({
                  fuelTypeId: "",
                  searchFuelTypeInputValue: "",
                })
              }
            >
              <X />
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {/* Fuel Type Selection (Required) */}
        <div>
          <SearchFuelType
            errorFuelTypeId={state.createFuelError?.fuelTypeId}
            searchFuelTypeInputValue={
              commandFuelTypeInputValue.searchFuelTypeInputValue
            }
            businessId={businessId}
            handleUpdateSearchFuelTypeInputValue={
              handleUpdateSearchFuelTypeInputValue
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
          disabled={!commandFuelTypeInputValue.fuelTypeId}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

// Step 4: Create Fuel Form
const DashboardCreateFuelFormContainer = ({
  state,
  onBack,
  businessId,
  commandVehicleInputValue,
  odometerFile,
  setOdometerFile,
  fileError,
  setFileError,
  handleLocationChange,
  handleLocationLoadingChange,
  latitude,
  longitude,
  isLoadingLocation,
}: DashboardCreateFuelContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId,
    businessId: businessId,
  });

  // Function to handle changes in custom fields (datepicker)
  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const [displayPricePerLiter, setDisplayPricePerLiter] = useState<string>("");

  const handlePricePerLiterChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    let inputValue = e.target.value;
    inputValue = inputValue.replace(/[^\d,.]/g, "");
    setDisplayPricePerLiter(inputValue);
  };

  const handlePricePerLiterBlur = (): void => {
    if (
      !displayPricePerLiter ||
      displayPricePerLiter === "," ||
      displayPricePerLiter === "."
    ) {
      setDisplayPricePerLiter("");
      return;
    }

    const newNumericValue = formatCurrencyToNumber(displayPricePerLiter);
    setDisplayPricePerLiter(formatToBrazilianCurrency(newNumericValue));
  };

  const [displayMileage, setDisplayMileage] = useState<string>("");
  const [displayLiters, setDisplayLiters] = useState<string>("");

  // Refs para os inputs para submissão do form
  const mileageInputRef = useRef<HTMLInputElement>(null);
  const litersInputRef = useRef<HTMLInputElement>(null);

  const handleMileageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const rawValue = e.target.value;
    const numbersOnly = rawValue.replace(/\D/g, "");

    const formatted = formatMileage(numbersOnly);
    setDisplayMileage(formatted);

    // Atualiza o valor real para submissão do form
    if (mileageInputRef.current) {
      mileageInputRef.current.value = mileageToNumber(formatted);
    }
  };

  const handleLitersChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const rawValue = e.target.value;
    const formatted = formatLiters(rawValue);

    setDisplayLiters(formatted);

    // Converte para formato numérico para o backend (vírgula -> ponto)
    if (litersInputRef.current) {
      litersInputRef.current.value = litersToNumber(formatted);
    }
  };

  // File validation function
  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith("image/")) {
      return "Arquivo deve ser uma imagem.";
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return "Tipo de arquivo não suportado. Use apenas JPEG, JPG, PNG ou WebP.";
    }

    if (file.size > 5 * 1024 * 1024) {
      return "O arquivo deve ter no máximo 5MB.";
    }

    return null;
  };

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 1,
    multiple: false,
    disabled: pending,
    onDrop: (acceptedFiles: File[], rejectedFiles) => {
      setFileError(null);

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          setFileError("O arquivo deve ter no máximo 5MB.");
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          setFileError(
            "Tipo de arquivo não suportado. Use apenas JPEG, JPG, PNG ou WebP.",
          );
        } else {
          setFileError("Arquivo inválido.");
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const validationError = validateFile(file);

        if (validationError) {
          setFileError(validationError);
          setOdometerFile(null);
        } else {
          setFileError(null);
          setOdometerFile(file);
        }
      }
    },
  });

  // Remove file function
  const removeFile = () => {
    setOdometerFile(null);
    setFileError(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Refueling Date */}
        <DatePickerField
          label="Data do abastecimento"
          htmlfor="refueling_date"
          name="refueling_date"
          value={formValues.refueling_date || ""}
          onChange={handleCustomFieldChange("refueling_date")}
          errorName={state.createFuelError?.refueling_date}
          disabled={pending}
        />

        {/* Current Mileage (user input) */}
        <div>
          <FormInput
            label="Quilometragem"
            htmlfor="current_mileage_display"
            name="current_mileage_display"
            type="text"
            placeholder="Ex: 15.234"
            errorName={state.createFuelError?.current_mileage}
            disabled={pending}
            value={displayMileage}
            onChange={handleMileageChange}
          />
          {/* Hidden input com valor real para submissão */}
          <input
            ref={mileageInputRef}
            type="hidden"
            name="current_mileage"
            value={mileageToNumber(displayMileage)}
          />
        </div>

        {/* Liters Amount */}
        <div>
          <FormInput
            label="Quantidade de litros"
            htmlfor="liters_amount_display"
            name="liters_amount_display"
            type="text"
            errorName={state.createFuelError?.liters_amount}
            placeholder="Ex: 45,237"
            disabled={pending}
            value={displayLiters}
            onChange={handleLitersChange}
          />
          {/* Hidden input com valor real para submissão */}
          <input
            ref={litersInputRef}
            type="hidden"
            name="liters_amount"
            value={litersToNumber(displayLiters)}
          />
        </div>

        {/* Price per Liter */}
        <FormInput
          label="Preço por litro"
          htmlfor="price_per_liter"
          name="price_per_liter"
          type="text"
          errorName={state.createFuelError?.price_per_liter}
          value={displayPricePerLiter}
          onChange={handlePricePerLiterChange}
          onBlur={handlePricePerLiterBlur}
          placeholder="0,00"
          disabled={pending}
        />

        {/* Notes */}
        <div className="col-span-1 md:col-span-2">
          <FormInput
            label="Observações (opcional)"
            htmlfor="notes"
            name="notes"
            type="text"
            errorName={state.createFuelError?.notes}
            placeholder="Digite observações sobre o abastecimento..."
            disabled={pending}
            maxLength={500}
          />
        </div>

        {/* Odometer Photo Upload */}
        <div className="col-span-1 md:col-span-2">
          {fileError || state.createFuelError?.odometer_photo ? (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label
                    className="block text-sm font-medium
                  text-red-500 mb-2 h-5 truncate"
                  >
                    {fileError || state.createFuelError?.odometer_photo?.[0]}
                  </label>
                </TooltipTrigger>
                <TooltipContent
                  align="start"
                  className="max-w-[300px]
                  whitespace-normal break-words p-2"
                >
                  {fileError || state.createFuelError?.odometer_photo?.[0]}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <label
              className="block text-sm font-medium
              text-gray-700 dark:text-gray-300 mb-2"
            >
              Foto do Odômetro <span className="text-red-500">*</span>
            </label>
          )}

          {!odometerFile ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6
              text-center cursor-pointer transition-colors
                ${
                  isDragActive
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                }
                ${pending ? "opacity-50 cursor-not-allowed" : ""}
                ${fileError || state.createFuelError?.odometer_photo ? "border-red-300 bg-red-50 dark:bg-red-950/20" : ""}`}
            >
              <input {...getInputProps()} name="odometer_photo" />
              <div className="flex flex-col items-center space-y-2">
                <Upload
                  className={`h-8 w-8 ${isDragActive ? "text-blue-500" : "text-gray-400"}`}
                />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {isDragActive ? (
                    <p>Solte a imagem aqui...</p>
                  ) : (
                    <>
                      <p>
                        Arraste e solte uma foto do odômetro aqui, ou{" "}
                        <span className="font-medium text-blue-600 hover:text-blue-500">
                          clique para selecionar
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, JPEG ou WebP até 5MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-3 p-4 bg-green-50 
              dark:bg-green-950/20 rounded-lg border border-green-200"
            >
              <div className="flex-shrink-0">
                <ImageIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div>
                  <p
                    className="text-sm font-medium
                    text-green-800 dark:text-green-200"
                  >
                    {odometerFile.name}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {(odometerFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeFile}
                disabled={pending}
                className="text-red-600 hover:text-red-800
                hover:bg-red-100 dark:hover:bg-red-950/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* 📍 GEOLOCATION: Location Picker */}
        <div className="col-span-1 md:col-span-2">
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onLocationChange={handleLocationChange}
            onLoadingChange={handleLocationLoadingChange}
            disabled={pending}
            error={
              state.createFuelError?.latitude?.[0] ||
              state.createFuelError?.longitude?.[0]
            }
          />
        </div>

        {/* Information Alert */}
        <div className="col-span-1 md:col-span-2 mt-4">
          <Alert
            className="border-blue-200 
            bg-blue-50 dark:bg-blue-950/20"
          >
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <strong>ℹ️ Informações importantes:</strong>
              <br />
              • Informe a quilometragem atual do veículo no momento do
              reabastecimento
              <br />
              • Não é possível informar uma quilometragem menor que a atual do
              veículo
              <br />• O valor total será calculado automaticamente (litros ×
              preço por litro)
            </AlertDescription>
          </Alert>
        </div>

        {/* Current Vehicle Info */}
        {data && (
          <div
            className="col-span-1 md:col-span-2 mt-4 p-4 bg-green-50 
            dark:bg-green-900/20 rounded-lg border border-green-200"
          >
            <p className="text-sm text-green-700 dark:text-green-300">
              <strong>🚗 Dados do Veículo Selecionado:</strong>
              <br />
              Quilometragem atual: {data.current_mileage.toLocaleString()} km
              <br />
              Intervalo de manutenção:{" "}
              {data.maintenance_interval_km.toLocaleString()} km
              {data.last_maintenance_mileage && (
                <>
                  <br />
                  Última manutenção:{" "}
                  {data.last_maintenance_mileage.toLocaleString()} km
                </>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={pending || isLoadingVehicle || isLoadingLocation}
        >
          <span>Criar Abastecimento</span>
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </div>
    </>
  );
};

const DashboardCreateFuelForm = (): JSX.Element => {
  const defaultState: DashboardCreateFuelFormState = {};
  const [state, dispatch] = useFormState(handleCreateFuel, null);

  const [odometerFile, setOdometerFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

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
    isCreateFuelForm,
    formRef,
    handleCloseDialog,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    commandFuelTypeInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchFuelTypeInputValue,
    handleBusinessBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleFuelTypeStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleDriverStep,
    handleBackToFuelTypeStep,
  } = useDashboardCreateFuelForm(state);

  const { businessId } = useAuthStore();
  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.FUEL_MANAGE,
      action: "write",
      label: getPermissionName(permissions.FUEL_MANAGE),
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
      key: permissions.DRIVER_MANAGE,
      action: "read",
      label: getPermissionName(permissions.DRIVER_MANAGE),
    },
    {
      key: permissions.FUEL_TYPE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.FUEL_TYPE_MANAGE),
    },
  ]);

  // Reset file and geolocation states when modal closes or on success
  useEffect(() => {
    if (!isCreateFuelForm) {
      setOdometerFile(null);
      setFileError(null);

      setLatitude(null);
      setLongitude(null);

      setIsLoadingLocation(false);
    }
  }, [isCreateFuelForm]);

  // Reset file and geolocation states on successful creation
  useEffect(() => {
    if (state?.successMessage) {
      setOdometerFile(null);
      setFileError(null);

      setLatitude(null);
      setLongitude(null);

      setIsLoadingLocation(false);
    }
  }, [state?.successMessage]);

  return (
    <Dialog open={isCreateFuelForm} onOpenChange={handleCloseDialog}>
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
                  Criar Abastecimento
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

      <DialogScrollContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-branch"
              ? "Selecionar Filial"
              : currentStep === "select-vehicle-driver"
                ? "Selecionar Veículo e Motorista"
                : currentStep === "select-fuel-type"
                  ? "Selecionar Tipo de Combustível"
                  : "Criar Novo Abastecimento"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-branch"
              ? "Selecione a filial para a qual deseja criar um abastecimento."
              : currentStep === "select-vehicle-driver"
                ? "Selecione o veículo e motorista para o abastecimento."
                : currentStep === "select-fuel-type"
                  ? "Selecione o tipo de combustível."
                  : "Insira as informações do abastecimento abaixo."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-branch" ? (
          <DashboardSelectBranchStep
            state={state ?? defaultState}
            businessId={businessId as string}
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            onContinue={handleBusinessBranchStepContinue}
            commandBranchInputValue={commandBranchInputValue}
          />
        ) : currentStep === "select-vehicle-driver" ? (
          <DashboardSelectVehicleDriverStep
            state={state ?? defaultState}
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
          />
        ) : currentStep === "select-fuel-type" ? (
          <DashboardSelectFuelTypeStep
            state={state ?? defaultState}
            businessId={businessId as string}
            commandFuelTypeInputValue={commandFuelTypeInputValue}
            handleUpdateSearchFuelTypeInputValue={
              handleUpdateSearchFuelTypeInputValue
            }
            onContinue={handleFuelTypeStepContinue}
            onBack={handleBackToVehicleDriverStep}
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
                // Remove points if still present
                const numericValue = mileageInput.value.replace(/\./g, "");
                mileageInput.value = numericValue;

                formData.set("current_mileage", numericValue);
              }

              // Add selected IDs to form data
              const extraData = {
                businessId: businessId as string,
                branchId: commandBranchInputValue.branchId,
                vehicleId: commandVehicleInputValue.vehicleId,
                driverId: commandDriverInputValue.driverId,
                fuelTypeId: commandFuelTypeInputValue.fuelTypeId,
                latitude: latitude?.toString() as string,
                longitude: longitude?.toString() as string,
              };

              // Add the odometer photo file to FormData
              if (odometerFile) {
                formData.set("odometer_photo", odometerFile);
              }

              appendExtraDataToForm(formData, extraData);
              return dispatch(formData);
            }}
          >
            <DashboardCreateFuelFormContainer
              state={state ?? defaultState}
              onBack={handleBackToFuelTypeStep}
              businessId={businessId as string}
              commandVehicleInputValue={commandVehicleInputValue}
              odometerFile={odometerFile}
              setOdometerFile={setOdometerFile}
              fileError={fileError}
              setFileError={setFileError}
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

export { DashboardCreateFuelForm };
