import dynamic from "next/dynamic";

import { useFormStatus } from "react-dom";
import { Info, Loader } from "lucide-react";

import FormInput from "@/components/shared/custom/form-input";
import { Button } from "@/components/ui/button";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";

import { UploadProgress } from "@/components/shared/upload-progress";
import { useFetchVehicleData } from "@/app/(protected)/_components/shared/searches/search-vehicle-by-id-business";

import type { CreateFuelFormSubmitProps } from "../create-fuel-form.types";

import { useFuelFormInputs } from "./hooks";
import { FuelPhotoDropzone } from "../fuel-photo-dropzone";

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
  uploadProgress,
  uploadError,
}: CreateFuelFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  const { data, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId: commandVehicleInputValue.vehicleId,
    businessId: commandBusinessInputValue.businessId,
  });

  // Utilizando o nosso novo hook customizado
  const inputs = useFuelFormInputs(initialFormValues);

  const handleBack = () => {
    onFormValuesChange(inputs.getFormValues());
    onBack();
  };

  return (
    <>
      <div className="mt-5">
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            <strong>ℹ️ Informações importantes:</strong>
            <br />• Informe a quilometragem atual do veículo no momento do
            reabastecimento
            <br />• Não é possível informar uma quilometragem menor que a atual
            do veículo
            <br />• O valor total será calculado automaticamente (litros × preço
            por litro)
          </AlertDescription>
        </Alert>
      </div>

      {data && (
        <div
          className="mt-4 p-4 dark:bg-green-900/20 rounded-lg 
          border bg-green-50 border-green-200"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <DatePickerField
          label="Data do abastecimento *"
          htmlfor="refueling_date"
          name="refueling_date"
          value={inputs.refuelingDate}
          onChange={inputs.handleRefuelingDateChange}
          errorName={state.createFuelError?.refueling_date}
          disabled={pending}
        />

        <FormInput
          label="Quilometragem *"
          htmlfor="current_mileage"
          name="current_mileage"
          type="text"
          placeholder="Ex: 15.234"
          errorName={state.createFuelError?.current_mileage}
          disabled={pending}
          value={inputs.displayMileage}
          onChange={inputs.handleMileageChange}
        />

        <FormInput
          label="Quantidade de litros *"
          htmlfor="liters_amount"
          name="liters_amount"
          type="text"
          errorName={state.createFuelError?.liters_amount}
          placeholder="Ex: 45,237"
          disabled={pending}
          value={inputs.displayLiters}
          onChange={inputs.handleLitersChange}
          onBlur={inputs.handleLitersBlur}
        />

        <FormInput
          label="Preço por litro *"
          htmlfor="price_per_liter"
          name="price_per_liter"
          type="text"
          errorName={state.createFuelError?.price_per_liter}
          value={inputs.displayPricePerLiter}
          onChange={inputs.handlePricePerLiterChange}
          onBlur={inputs.handlePricePerLiterBlur}
          placeholder="0,00"
          disabled={pending}
        />

        <div className="col-span-1 md:col-span-2">
          <FormInput
            label="Observações (opcional)"
            htmlfor="notes"
            name="notes"
            type="text"
            value={inputs.notes}
            onChange={(e) => inputs.setNotes(e.target.value)}
            errorName={state.createFuelError?.notes}
            placeholder="Digite observações sobre o abastecimento..."
            disabled={pending}
            maxLength={500}
          />
        </div>

        <FuelPhotoDropzone
          odometerFile={odometerFile}
          setOdometerFile={setOdometerFile}
          fileError={fileError}
          setFileError={setFileError}
          serverError={state.createFuelError?.odometer_photo}
          pending={pending}
        />

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
