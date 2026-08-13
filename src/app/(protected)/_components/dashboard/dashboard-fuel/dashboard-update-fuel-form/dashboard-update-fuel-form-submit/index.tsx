import { useState } from "react";
import { useFormStatus } from "react-dom";

import Image from "next/image";
import {
  Info,
  Loader,
  Upload,
  Image as ImageIcon,
  Eye,
  Trash2,
} from "lucide-react";

import { useDropzone } from "react-dropzone";
import dynamic from "next/dynamic";

import FormInput from "@/components/shared/custom/form-input";
import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";

import { Button } from "@/components/ui/button";
import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
  formatMileage,
  formatLiters,
  mileageToNumber,
  litersToNumber,
  formatNotificationDate,
} from "@/lib/format-values";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFetchVehicleData } from "@/app/(protected)/_components/shared/searches/search-vehicle-by-id-business";

import type { DashboardUpdateFuelFormSubmitProps } from "../dashboard-update-fuel-form.types";
import { useAuthStore } from "@/store/auth-store";

import { UploadProgress } from "@/components/shared/upload-progress";
import { compressImage } from "@/lib/compress-image";

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

const DashboardUpdateFuelFormSubmit = ({
  state,
  onBack,
  fuelData,
  isBusinessAndEntityDirty,
  initialFormValues,
  onFormValuesChange,
  commandVehicleInputValue,
  odometerFile,
  setOdometerFile,
  fileError,
  setFileError,
  setShowImageModal,
  handleLocationChange,
  handleLocationLoadingChange,
  latitude,
  longitude,
  isLoadingLocation,
  uploadProgress,
  uploadError,
}: DashboardUpdateFuelFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { businessId } = useAuthStore();

  // Fetch current vehicle data for validation - use selected vehicle or fallback to original
  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId || fuelData.vehicleId,
    businessId: businessId as string,
  });

  // Helper to get initial date value
  const getInitialRefuelingDate = (): string => {
    if (initialFormValues.refueling_date !== undefined) {
      return initialFormValues.refueling_date;
    }
    return fuelData.refueling_date instanceof Date
      ? fuelData.refueling_date.toISOString().split("T")[0]
      : fuelData.refueling_date;
  };

  // Form field states with lazy initializers
  const [refuelingDate, setRefuelingDate] = useState<string>(() =>
    getInitialRefuelingDate(),
  );

  const [displayPricePerLiter, setDisplayPricePerLiter] = useState<string>(
    () =>
      initialFormValues.price_per_liter ??
      formatToBrazilianCurrency(fuelData.price_per_liter),
  );

  const [displayMileage, setDisplayMileage] = useState<string>(
    () =>
      initialFormValues.current_mileage ??
      formatMileage(fuelData.current_mileage.toString()),
  );

  const [displayLiters, setDisplayLiters] = useState<string>(
    () =>
      initialFormValues.liters_amount ??
      formatLiters(fuelData.liters_amount.toString()),
  );

  const [notes, setNotes] = useState<string>(
    () => initialFormValues.notes ?? (fuelData.notes || ""),
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
    const numericValue = displayLiters.replace(",", ".");
    const input = document.querySelector(
      'input[name="liters_amount"]',
    ) as HTMLInputElement;
    if (input) {
      input.value = numericValue;
    }
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
    onDrop: async (acceptedFiles: File[], rejectedFiles) => {
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

          // Shrunk and stripped of metadata before it leaves the browser. With
          // direct-to-storage uploads nothing on the server re-encodes it, so
          // an untouched camera JPEG would carry its GPS coordinates into the
          // bucket.
          setOdometerFile(await compressImage(file));
        }
      }
    },
  });

  // Remove file function
  const removeFile = () => {
    setOdometerFile(null);
    setFileError(null);
  };

  const hasFileChange = odometerFile !== null;

  const hasLocationChanged =
    latitude !== (fuelData.latitude ?? null) ||
    longitude !== (fuelData.longitude ?? null);

  // Dirty checking for form fields
  const originalRefuelingDate =
    fuelData.refueling_date instanceof Date
      ? fuelData.refueling_date.toISOString().split("T")[0]
      : fuelData.refueling_date;

  const originalPriceNumeric =
    typeof fuelData.price_per_liter === "number"
      ? fuelData.price_per_liter
      : formatCurrencyToNumber(fuelData.price_per_liter as string);

  const isDirty = [
    refuelingDate !== originalRefuelingDate,
    Number(mileageToNumber(displayMileage)) !== fuelData.current_mileage,
    Number(litersToNumber(displayLiters)) !== fuelData.liters_amount,
    formatCurrencyToNumber(displayPricePerLiter) !== originalPriceNumeric,
    notes !== (fuelData.notes || ""),
  ].some(Boolean);

  const hasAnyChange =
    isDirty || isBusinessAndEntityDirty || hasFileChange || hasLocationChanged;

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
            • A quilometragem não pode ser menor que a atual do veículo
            <br />
            • O valor total será recalculado automaticamente (litros × preço por
            litro)
            <br />• Alterações na quilometragem atualizarão o veículo
          </AlertDescription>
        </Alert>
      </div>

      {data && (
        <div
          className="mt-4 p-4 bg-green-50
          dark:bg-green-900/20 rounded-lg border border-green-200"
        >
          <p className="text-sm text-green-700 dark:text-green-300">
            <strong>🚗 Dados Atuais do Veículo:</strong>
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
          errorName={state.updateFuelError?.refueling_date}
          disabled={pending}
        />

        {/* Current Mileage */}
        <FormInput
          label="Quilometragem *"
          htmlfor="current_mileage"
          name="current_mileage"
          type="text"
          value={displayMileage}
          onChange={handleMileageChange}
          errorName={state.updateFuelError?.current_mileage}
          disabled={pending}
          placeholder="Ex: 15.234"
        />

        {/* Liters Amount */}
        <FormInput
          label="Quantidade de litros *"
          htmlfor="liters_amount"
          name="liters_amount"
          type="text"
          value={displayLiters}
          onChange={handleLitersChange}
          onBlur={handleLitersBlur}
          errorName={state.updateFuelError?.liters_amount}
          disabled={pending}
          placeholder="Ex: 45,237"
        />

        {/* Price per Liter */}
        <FormInput
          label="Preço por litro *"
          htmlfor="price_per_liter"
          name="price_per_liter"
          type="text"
          errorName={state.updateFuelError?.price_per_liter}
          value={displayPricePerLiter}
          onChange={handlePricePerLiterChange}
          onBlur={handlePricePerLiterBlur}
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
            errorName={state.updateFuelError?.notes}
            disabled={pending}
            maxLength={500}
          />
        </div>

        {/* Odometer Photo Upload */}
        <div className="col-span-1 md:col-span-2">
          <div
            className="block text-sm font-medium
            text-gray-700 dark:text-gray-300 mb-2"
          >
            Foto do Odômetro
          </div>

          {/* Current Image Preview */}
          {fuelData.odometer_photo && !odometerFile && (
            <div
              className="mb-4 border-2 border-dashed border-blue-300
              bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ImageIcon className="h-8 w-8 text-blue-600" />
                  <div>
                    <p
                      className="text-sm font-medium 
                    text-blue-800 dark:text-blue-200"
                    >
                      Imagem atual do odômetro
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Clique para visualizar em tela cheia
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImageModal(true)}
                  disabled={pending}
                  className="text-blue-600 hover:text-blue-800
                  hover:bg-blue-100 dark:hover:bg-blue-950/20"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 relative w-full h-32">
                <Image
                  src={fuelData.odometer_photo}
                  alt="Imagem atual do odômetro"
                  fill
                  className="object-contain rounded cursor-pointer
                  hover:opacity-80 transition-opacity"
                  onClick={() => setShowImageModal(true)}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={false}
                  // Mesma razao do modal abaixo: URL assinada do R2 nao passa
                  // pelo otimizador do Next.
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* New File Upload */}
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
                ${fileError || state.updateFuelError?.odometer_photo ? "border-red-300 bg-red-50 dark:bg-red-950/20" : ""}`}
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
                    <p>Solte a nova imagem aqui...</p>
                  ) : (
                    <>
                      <p>
                        <span className="font-medium">
                          Clique para selecionar
                        </span>{" "}
                        ou arraste uma nova imagem
                      </p>
                      <p className="text-xs mt-1">
                        PNG, JPG, JPEG, WebP (máx. 5MB)
                      </p>
                      {fuelData.odometer_photo && (
                        <p className="text-xs text-orange-600 mt-1">
                          Substituirá a imagem atual
                        </p>
                      )}
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
                    <p
                      className="text-xs text-orange-600 
                      dark:text-orange-400"
                    >
                      Substituirá a imagem atual
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
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {(fileError || state.updateFuelError?.odometer_photo) && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {fileError || state.updateFuelError?.odometer_photo?.[0]}
            </p>
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
              state.updateFuelError?.latitude?.[0] ||
              state.updateFuelError?.longitude?.[0]
            }
          />
        </div>

        {/* History Information */}
        <div className="col-span-1 md:col-span-2 mt-4">
          <div
            className="bg-purple-50 dark:bg-purple-900/20 
            p-4 rounded-lg border border-purple-200"
          >
            <h4
              className="font-semibold text-purple-700 
              dark:text-purple-300 mb-2"
            >
              📊 Informações de Controle:
            </h4>
            <div
              className="text-sm text-purple-600 
              dark:text-purple-400 space-y-1"
            >
              <div>
                • <strong>Data de criação:</strong>{" "}
                {formatNotificationDate(fuelData.created_at, "pt-BR")}
              </div>
              <div>
                • <strong>Última atualização:</strong>{" "}
                {formatNotificationDate(fuelData.updated_at, "pt-BR")}
              </div>
              <div>
                • <strong>Odômetro verificado:</strong>{" "}
                {fuelData.odometer_verified ? "✅ Sim" : "❌ Não"}
              </div>
              <div>
                • <strong>Valor total atual:</strong>{" "}
                {formatToBrazilianCurrency(fuelData.total_amount)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <UploadProgress progress={uploadProgress} error={uploadError} />
      </div>

      <div className="flex justify-end mt-4 gap-2">
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
          disabled={
            pending || !hasAnyChange || isLoadingVehicle || isLoadingLocation
          }
        >
          <span>Editar Abastecimento</span>
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

export { DashboardUpdateFuelFormSubmit };
