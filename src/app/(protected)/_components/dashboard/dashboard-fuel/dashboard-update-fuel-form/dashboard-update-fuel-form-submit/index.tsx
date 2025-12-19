import { useState, useEffect } from "react";
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

import FormInput from "@/components/custom/form-input";
import { DatePickerField } from "../../../../custom";

import { Button } from "@/components/ui/button";

import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
  formatMileage,
  formatLiters,
  mileageToNumber,
  litersToNumber,
} from "@/lib/format-values";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFetchVehicleData } from "../../../../search-vehicle-by-id-business";

import { DashboardUpdateFuelFormSubmitProps } from "../dto";
import { useAuthStore } from "@/store/auth-store";

// Dynamic import for LocationPicker (client-side only)
const LocationPicker = dynamic(
  () => import("@/app/(protected)/_components/custom/location-picker"),
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
  isUpdateFuelOpen,
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
}: DashboardUpdateFuelFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { businessId } = useAuthStore();

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Fetch current vehicle data for validation - use selected vehicle or fallback to original
  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId || fuelData.vehicleId,
    businessId: businessId as string,
  });

  // Initialize form values when the component mounts
  useEffect(() => {
    if (fuelData && isUpdateFuelOpen) {
      setFormValues({
        refueling_date: fuelData.refueling_date,
        current_mileage: fuelData.current_mileage.toString(),
        liters_amount: fuelData.liters_amount,
        price_per_liter: fuelData.price_per_liter,
        notes: fuelData.notes && fuelData.notes !== "N/A" ? fuelData.notes : "",
      });
    }
  }, [fuelData, isUpdateFuelOpen]);

  // Function to handle changes in form fields
  const handleFieldChange = (fieldName: string, value: string | number) => {
    setFormValues((prev) => {
      const stringValue = typeof value === "number" ? value.toString() : value;
      const newValues = { ...prev, [fieldName]: stringValue };

      // Check if any field has changed
      const isAnyFieldChanged = Object.entries(newValues).some(([key, val]) => {
        const originalValue = fuelData[key as keyof typeof fuelData];

        // Special handling for notes
        if (key === "notes") {
          const originalIsEmpty = !originalValue || originalValue === "N/A";
          const newIsEmpty = !val;

          if (originalIsEmpty && newIsEmpty) return false;
          if (originalIsEmpty !== newIsEmpty) return true;

          return originalValue !== val;
        }

        // Special handling for dates to normalize comparison
        if (key === "refueling_date") {
          const normalizeDate = (dateStr: string) => {
            if (!dateStr) return "";
            // Convert to ISO date string (YYYY-MM-DD) for consistent comparison
            return new Date(dateStr).toISOString().split("T")[0];
          };

          const originalNormalized = normalizeDate(originalValue as string);
          const newNormalized = normalizeDate(val);

          return originalNormalized !== newNormalized;
        }

        if (typeof originalValue === "number") {
          return originalValue.toString() !== val;
        }

        return originalValue !== val;
      });

      setIsDirty(isAnyFieldChanged);
      return newValues;
    });
  };

  // Function to handle changes in custom fields (datepicker)
  const handleCustomFieldChange = (fieldName: string) => (value: string) => {
    handleFieldChange(fieldName, value);
  };

  const [displayPricePerLiter, setDisplayPricePerLiter] = useState<string>(
    fuelData.price_per_liter || "",
  );

  useEffect(() => {
    if (fuelData && fuelData.price_per_liter) {
      setDisplayPricePerLiter(fuelData.price_per_liter);
    }
  }, [fuelData]);

  const handlePricePerLiterChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    let inputValue = e.target.value;
    inputValue = inputValue.replace(/[^\d,.]/g, "");

    setDisplayPricePerLiter(inputValue);
    handleFieldChange("price_per_liter", inputValue);
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
    const formattedValue = formatToBrazilianCurrency(newNumericValue);

    setDisplayPricePerLiter(formattedValue);
    handleFieldChange("price_per_liter", formattedValue);
  };

  // States for formatted display values
  const [displayMileage, setDisplayMileage] = useState<string>("");
  const [displayLiters, setDisplayLiters] = useState<string>("");

  // Initialize display values when component mounts or data changes
  useEffect(() => {
    if (fuelData && isUpdateFuelOpen) {
      setDisplayMileage(formatMileage(fuelData.current_mileage.toString()));
      setDisplayLiters(formatLiters(fuelData.liters_amount));
    }
  }, [fuelData, isUpdateFuelOpen]);

  const handleMileageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const rawValue = e.target.value;
    const numbersOnly = rawValue.replace(/\D/g, "");

    const formatted = formatMileage(numbersOnly);

    setDisplayMileage(formatted);
    // Update form state with numeric value
    handleFieldChange("current_mileage", mileageToNumber(formatted));
  };

  const handleLitersChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const rawValue = e.target.value;
    const formatted = formatLiters(rawValue);

    setDisplayLiters(formatted);
    // Update form state with numeric value (convert comma to dot)
    handleFieldChange("liters_amount", litersToNumber(formatted));
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

  const hasFileChange = odometerFile !== null;

  // 📍 Check if location has changed
  const [hasLocationChanged, setHasLocationChanged] = useState<boolean>(false);

  useEffect(() => {
    const originalLat = fuelData.latitude ?? null;
    const originalLng = fuelData.longitude ?? null;

    // Check if location changed (compare with original fuelData values)
    const latChanged = originalLat !== latitude;
    const lngChanged = originalLng !== longitude;

    setHasLocationChanged(latChanged || lngChanged);
  }, [latitude, longitude, fuelData.latitude, fuelData.longitude]);

  const hasAnyChange =
    isDirty || isBusinessAndEntityDirty || hasFileChange || hasLocationChanged;

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
          errorName={state.updateFuelError?.refueling_date}
          disabled={pending}
        />

        {/* Current Mileage */}
        <FormInput
          label="Quilometragem"
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
          label="Quantidade de litros"
          htmlfor="liters_amount"
          name="liters_amount"
          type="text"
          value={displayLiters}
          onChange={handleLitersChange}
          errorName={state.updateFuelError?.liters_amount}
          disabled={pending}
          placeholder="Ex: 45,237"
        />

        {/* Price per Liter */}
        <FormInput
          label="Preço por litro"
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
            value={formValues.notes || ""}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
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

        {/* Information Alert */}
        <div className="col-span-1 md:col-span-2 mt-4">
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
              • O valor total será recalculado automaticamente (litros × preço
              por litro)
              <br />• Alterações na quilometragem atualizarão o veículo
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
                • <strong>Data de criação:</strong> {fuelData.created_at}
              </div>
              <div>
                • <strong>Última atualização:</strong> {fuelData.updated_at}
              </div>
              <div>
                • <strong>Odômetro verificado:</strong>{" "}
                {fuelData.odometer_verified ? "✅ Sim" : "❌ Não"}
              </div>
              <div>
                • <strong>Valor total atual:</strong> {fuelData.total_amount}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={
            pending || !hasAnyChange || isLoadingVehicle || isLoadingLocation
          }
        >
          <span>Atualizar Abastecimento</span>
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
