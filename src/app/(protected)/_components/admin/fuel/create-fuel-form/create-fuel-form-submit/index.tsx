import { useState } from "react";
import { useDropzone } from "react-dropzone";

import dynamic from "next/dynamic";

import { useFormStatus } from "react-dom";
import { Info, Loader, X, Upload, Image as ImageIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import FormInput from "@/components/shared/custom/form-input";
import { Button } from "@/components/ui/button";

import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
  formatMileage,
  formatLiters,
} from "@/lib/format-values";
import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFetchVehicleData } from "@/app/(protected)/_components/shared/searches/search-vehicle-by-id-business";

import type { CreateFuelFormSubmitProps } from "../create-fuel-form.types";

// Dynamic import for LocationPicker (client-side only)
const LocationPicker = dynamic(
  () => import("@/app/(protected)/_components/shared/custom/location-picker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        Carregando mapa...
      </div>
    ),
  },
);

const CreateFuelFormSubmit = ({
  state,
  onBack,
  initialFormValues,
  onFormValuesChange,
  commandBusinessInputValue,
  commandVehicleInputValue,
  handleLocationChange,
  handleLocationLoadingChange,
  latitude,
  longitude,
  isLoadingLocation,
  odometerFile,
  setOdometerFile,
  fileError,
  setFileError,
}: CreateFuelFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId,
    businessId: commandBusinessInputValue.businessId,
  });

  // Form field states with lazy initializers
  const [refuelingDate, setRefuelingDate] = useState<string>(
    () => initialFormValues.refueling_date || "",
  );

  const [displayPricePerLiter, setDisplayPricePerLiter] = useState<string>(
    () => initialFormValues.price_per_liter || "",
  );

  const [displayMileage, setDisplayMileage] = useState<string>(
    () => initialFormValues.current_mileage || "",
  );

  const [displayLiters, setDisplayLiters] = useState<string>(
    () => initialFormValues.liters_amount || "",
  );

  const [notes, setNotes] = useState<string>(
    () => initialFormValues.notes || "",
  );

  // Date handler
  const handleRefuelingDateChange = (value: string): void => {
    setRefuelingDate(value);
  };

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

  const handleMileageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const rawValue = e.target.value;

    const numbersOnly = rawValue.replace(/\D/g, "");
    const formatted = formatMileage(numbersOnly);

    setDisplayMileage(formatted);
  };

  const handleLitersChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const rawValue = e.target.value;
    const formatted = formatLiters(rawValue);

    setDisplayLiters(formatted);
  };

  const handleLitersBlur = (): void => {
    // Converte para formato numérico para o backend (vírgula -> ponto)
    const numericValue = displayLiters.replace(",", ".");
    // Atualiza o value do input para o HTML form submission
    const input = document.querySelector(
      'input[name="liters_amount"]',
    ) as HTMLInputElement;
    if (input) {
      input.value = numericValue;
    }
  };

  // File validation function
  const validateFile = (file: File): string | null => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return "Tipo de arquivo não suportado. Use apenas JPEG, JPG, PNG ou WebP.";
    }

    if (file.size > maxSize) {
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

  // Function to save form values and go back
  const handleBack = () => {
    const allFormValues: Record<string, string> = {
      refueling_date: refuelingDate,
      current_mileage: displayMileage,
      liters_amount: displayLiters,
      price_per_liter: displayPricePerLiter,
      notes: notes,
    };

    onFormValuesChange(allFormValues);
    onBack();
  };

  return (
    <>
      {/* Regras e dados de referência ficam ANTES dos campos: a restrição de
          quilometragem e a quilometragem atual do veículo precisam ser lidas
          durante o preenchimento, não depois de errar. */}
      <div className="mt-5">
        <Alert
          className="border-blue-200
          bg-blue-50 dark:bg-blue-950/20"
        >
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription
            className="text-blue-700
            dark:text-blue-300"
          >
            <strong>ℹ️ Informações importantes:</strong>
            <br />
            • Informe a quilometragem atual do veículo no momento do
            reabastecimento
            <br />
            • Não é possível informar uma quilometragem menor que a atual do
            veículo
            <br />• O valor total será calculado automaticamente (litros × preço
            por litro)
          </AlertDescription>
        </Alert>
      </div>

      {data && (
        <div
          className="mt-4 p-4 dark:bg-green-900/20 rounded-lg border
          bg-green-50 border-green-200"
        >
          <p
            className="text-sm text-green-700
            dark:text-green-300"
          >
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Refueling Date */}
        <DatePickerField
          label="Data do abastecimento *"
          htmlfor="refueling_date"
          name="refueling_date"
          value={refuelingDate}
          onChange={handleRefuelingDateChange}
          errorName={state.createFuelError?.refueling_date}
          disabled={pending}
        />

        {/* Current Mileage (user input) */}
        <FormInput
          label="Quilometragem *"
          htmlfor="current_mileage"
          name="current_mileage"
          type="text"
          placeholder="Ex: 15.234"
          errorName={state.createFuelError?.current_mileage}
          disabled={pending}
          value={displayMileage}
          onChange={handleMileageChange}
        />

        {/* Liters Amount */}
        <FormInput
          label="Quantidade de litros *"
          htmlfor="liters_amount"
          name="liters_amount"
          type="text"
          errorName={state.createFuelError?.liters_amount}
          placeholder="Ex: 45,237"
          disabled={pending}
          value={displayLiters}
          onChange={handleLitersChange}
          onBlur={handleLitersBlur}
        />

        {/* Price per Liter */}
        <FormInput
          label="Preço por litro *"
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
                  <div
                    className="block text-sm font-medium
                  text-red-500 mb-2 h-5 truncate cursor-default"
                  >
                    {fileError || state.createFuelError?.odometer_photo?.[0]}
                  </div>
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
            <div
              className="block text-sm font-medium
              text-gray-700 dark:text-gray-300 mb-2"
            >
              Foto do Odômetro <span className="text-red-500">*</span>
            </div>
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
              <input
                {...getInputProps()}
                name="odometer_photo"
                aria-label="Foto do Odômetro"
              />
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
                        <span className="font-medium">
                          Clique para selecionar
                        </span>{" "}
                        ou arraste a imagem
                      </p>
                      <p className="text-xs mt-1">
                        PNG, JPG, JPEG, WebP (máx. 5MB)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-green-300 
              bg-green-50 dark:bg-green-950/20 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ImageIcon className="h-8 w-8 text-green-600" />
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
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={pending || isLoadingVehicle || isLoadingLocation}
        >
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

export { CreateFuelFormSubmit };
