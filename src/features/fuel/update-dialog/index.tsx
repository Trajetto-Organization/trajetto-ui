"use client";

import dynamic from "next/dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Image from "next/image";
import { Eye, Image as ImageIcon, Loader } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";
import { SelectVehicleDriverStep } from "@/app/(protected)/_components/shared/steps/select-vehicle-driver-step";
import { SelectFuelTypeStep } from "@/app/(protected)/_components/shared/steps/select-fuel-type-step";
import { useFetchVehicleData } from "@/app/(protected)/_components/shared/searches/search-vehicle-by-id-business";
import type { FuelProps } from "@/app/(protected)/_components/shared/common.types";
import { UploadProgress } from "@/components/shared/upload-progress";

import { handleUpdateFuel } from "@/actions/fuel/update-fuel";
import { guardFormAction } from "@/lib/action-result";
import {
  formatNotificationDate,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { usePhotoUpload } from "@/hooks/use-photo-upload";

import { FuelFields, type FuelFieldErrors } from "../form/fuel-fields";
import { useFuelInputs, type FuelFormValues } from "../form/use-fuel-inputs";
import {
  FuelRulesAlert,
  LocationField,
  VehicleSummary,
} from "../form/context-panels";
import {
  useFuelWizard,
  wizardHeading,
  type FuelWizardSelection,
} from "../form/use-fuel-wizard";
import { refreshAfterFuelWrite } from "../form/after-write";
import {
  FUEL_CONTROL_IDS,
  FUEL_FIELDS,
  fuelMileageNote,
  fuelSchemaValues,
  odometerPhotoIssue,
} from "../lib/live-rules";
import { updateFuelFormSchema } from "@/schemas/create-update-fuel-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";
import {
  applyFuelEdit,
  changedFuelLinks,
  fuelFormFromRecord,
  fuelLocationChanged,
  fuelValuesChanged,
  hasFuelEditChanges,
} from "../lib/update-diff";
import { PhotoFieldLoading } from "@/components/shared/custom/photo-field-loading";

// Its own chunk (react-dropzone): loaded with this dialog, not with the page.
const PhotoDropzone = dynamic(
  () => import("../form/photo-dropzone").then((module) => module.PhotoDropzone),
  { ssr: false, loading: PhotoFieldLoading },
);

interface UpdateFuelErrors extends FuelFieldErrors {
  vehicleId?: string[];
  driverId?: string[];
  fuelTypeId?: string[];
  branchId?: string[];
  odometer_photo?: string[];
  latitude?: string[];
  longitude?: string[];
  updateFuelErrorMessage?: string;
}

interface UpdateFuelState {
  updateFuelError?: UpdateFuelErrors;
  successMessage?: string;
}

function selectionOf(fuel: FuelProps): FuelWizardSelection {
  return {
    branch: {
      branchId: fuel.branchId,
      searchBranchInputValue: fuel.branch?.corporate_reason ?? "",
    },
    vehicle: {
      vehicleId: fuel.vehicleId,
      searchVehicleInputValue: fuel.vehicle?.description ?? "",
      vehicleLicensePlate: fuel.vehicle?.license_plate ?? "",
    },
    driver: {
      driverId: fuel.driverId,
      searchDriverInputValue: fuel.driver?.name ?? "",
      driverCnh: fuel.driver?.cnh ?? "",
    },
    fuelType: {
      fuelTypeId: fuel.fuelTypeId,
      searchFuelTypeInputValue: fuel.fuelType?.description ?? "",
    },
  };
}

interface UpdateFuelFormStepProps {
  state: UpdateFuelState;
  fuel: FuelProps;
  vehicleId: string;
  values: FuelFormValues;
  linksChanged: boolean;
  onBack: (values: FuelFormValues) => void;
  onValuesChange: (values: FuelFormValues) => void;
  photo: File | null;
  setPhoto: (file: File | null) => void;
  photoError: string | null;
  setPhotoError: (error: string | null) => void;
  location: { latitude: number | null; longitude: number | null };
  setLocation: (latitude: number, longitude: number) => void;
  isLocating: boolean;
  setIsLocating: (value: boolean) => void;
  onShowPhoto: () => void;
  uploadProgress: { uploaded: number; total: number } | null;
  uploadError: string | null;
}

const UpdateFuelFormStep = ({
  state,
  fuel,
  vehicleId,
  values,
  linksChanged,
  onBack,
  onValuesChange,
  photo,
  setPhoto,
  photoError,
  setPhotoError,
  location,
  setLocation,
  isLocating,
  setIsLocating,
  onShowPhoto,
  uploadProgress,
  uploadError,
}: UpdateFuelFormStepProps): JSX.Element => {
  const { pending } = useFormStatus();
  const inputs = useFuelInputs(values);

  // The parent needs the typed values to decide whether Save is enabled.
  useEffect(() => {
    onValuesChange(inputs.values);
  }, [inputs.values, onValuesChange]);

  const { data: vehicle, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId,
    businessId: fuel.businessId,
  });

  const serverErrors = state.updateFuelError;
  const busy = pending || isLoadingVehicle || isLocating;

  // Live validation (decision 16.700): the action's schema on the numbers
  // the form posts; a replacement photo is optional, a refused file says why.
  const live = useLiveValidation({
    schema: updateFuelFormSchema,
    values: fuelSchemaValues(inputs.values),
    rules: () => ({
      odometer_photo: odometerPhotoIssue({
        photo,
        fileError: photoError,
        required: false,
      }),
    }),
    fields: [...FUEL_FIELDS, "odometer_photo"],
    serverErrors,
    controlIds: FUEL_CONTROL_IDS,
  });

  const errors = Object.fromEntries(
    FUEL_FIELDS.map((field) => [field, live.errorOf(field)]),
  );

  const photoMessage = live.messageOf("odometer_photo");

  const changed = hasFuelEditChanges({
    values: fuelValuesChanged(fuel, inputs.values),
    links: linksChanged,
    photo: photo !== null,
    location: fuelLocationChanged(fuel, location),
  });

  return (
    <div ref={live.ref} className="mt-2 space-y-5">
      <FuelRulesAlert mode="update" />
      <VehicleSummary vehicle={vehicle} />

      <FuelFields
        inputs={inputs}
        errors={errors}
        disabled={pending}
        mileageHint={
          // Only a corrected km is news; the stored one was already placed.
          fuelValuesChanged(fuel, inputs.values)
            ? fuelMileageNote(
                inputs.values.current_mileage,
                vehicle?.current_mileage,
              )
            : null
        }
      />

      {fuel.odometer_photo && !photo && (
        <div className="rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-4 dark:bg-blue-950/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ImageIcon className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Foto atual do odômetro
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Clique para ver em tela cheia
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onShowPhoto}
              disabled={pending}
              aria-label="Ver foto atual do odômetro"
              className="text-blue-600 hover:bg-blue-100 hover:text-blue-800 dark:hover:bg-blue-950/20"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative mt-2 h-32 w-full">
            <Image
              src={fuel.odometer_photo}
              alt="Foto atual do odômetro"
              fill
              className="cursor-pointer rounded object-contain transition-opacity hover:opacity-80"
              onClick={onShowPhoto}
              sizes="(max-width: 768px) 100vw, 50vw"
              // A signed storage URL: its host is not in remotePatterns and
              // its signature changes on every read, so the optimizer would
              // refuse it and never hit its cache anyway.
              unoptimized
            />
          </div>
        </div>
      )}

      <PhotoDropzone
        label="Nova foto do odômetro (opcional)"
        file={photo}
        onFileChange={(file) => {
          setPhoto(file);
          live.touch("odometer_photo");
        }}
        fileError={null}
        onFileError={(error) => {
          setPhotoError(error);
          if (error) live.touch("odometer_photo");
        }}
        serverError={photoMessage ? [photoMessage] : undefined}
        disabled={pending}
        replacesCurrent={Boolean(fuel.odometer_photo)}
      />

      <LocationField
        latitude={location.latitude}
        longitude={location.longitude}
        onLocationChange={setLocation}
        onLoadingChange={setIsLocating}
        disabled={pending}
        error={serverErrors?.latitude?.[0] || serverErrors?.longitude?.[0]}
      />

      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:bg-purple-900/20">
        <h4 className="mb-2 font-semibold text-purple-700 dark:text-purple-300">
          Informações de controle
        </h4>
        <div className="space-y-1 text-sm text-purple-600 dark:text-purple-400">
          <div>
            • <strong>Data de criação:</strong>{" "}
            {formatNotificationDate(fuel.created_at, "pt-BR")}
          </div>
          <div>
            • <strong>Última atualização:</strong>{" "}
            {formatNotificationDate(fuel.updated_at, "pt-BR")}
          </div>
          <div>
            • <strong>Odômetro verificado:</strong>{" "}
            {fuel.odometer_verified ? "Sim" : "Não"}
          </div>
          <div>
            • <strong>Valor total atual:</strong>{" "}
            {formatToBrazilianCurrency(fuel.total_amount)}
          </div>
        </div>
      </div>

      <UploadProgress progress={uploadProgress} error={uploadError} />

      <DialogFormFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onBack(inputs.values)}
          disabled={busy}
          {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
        >
          Voltar
        </Button>
        {/* Disabled while nothing changed (decision 2.5). */}
        <Button
          type="submit"
          disabled={busy || !canSubmitForm({ isEdit: true, isDirty: changed })}
        >
          <span>Salvar Alterações</span>
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </DialogFormFooter>
    </div>
  );
};

interface UpdateFuelDialogProps {
  fuel: FuelProps;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * "Editar Abastecimento", one dialog for /admin and /dashboard.
 *
 * The company is the record's own (`fuel.businessId`), right in both scopes;
 * the dashboard copy read the session's, which on /admin would have been
 * nobody's. Only the links the person changed are sent (FLEET-FUEL-1).
 */
const UpdateFuelDialog = ({
  fuel,
  isOpen,
  onClose,
}: UpdateFuelDialogProps): JSX.Element => {
  const [state, dispatch] = useFormState<UpdateFuelState, FormData>(
    guardFormAction(handleUpdateFuel),
    {},
  );

  const initialSelection = useMemo(() => selectionOf(fuel), [fuel]);
  const initialValues = useMemo(() => fuelFormFromRecord(fuel), [fuel]);

  const wizard = useFuelWizard(initialSelection);
  const [values, setValues] = useState<FuelFormValues>(initialValues);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState<boolean>(false);

  const [location, setLocationState] = useState({
    latitude: fuel.latitude ?? null,
    longitude: fuel.longitude ?? null,
  });
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const { uploadProgress, uploadError, resetUpload, uploadPhotos } =
    usePhotoUpload();

  const handledRef = useRef<UpdateFuelState | null>(null);

  const selectedLinks = {
    branchId: wizard.selection.branch.branchId,
    vehicleId: wizard.selection.vehicle.vehicleId,
    driverId: wizard.selection.driver.driverId,
    fuelTypeId: wizard.selection.fuelType.fuelTypeId,
  };

  const changedLinks = changedFuelLinks(fuel, selectedLinks);

  useEffect(() => {
    if (!state || handledRef.current === state) return;

    handledRef.current = state;

    if (state.updateFuelError?.updateFuelErrorMessage) {
      toast.error(state.updateFuelError.updateFuelErrorMessage);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);

      void refreshAfterFuelWrite().catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );

      resetUpload();
      onClose();
    }
    // onClose/resetUpload are stable enough; the effect answers one result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const submit = async (formData: FormData) => {
    if (photo) {
      const photos = await uploadPhotos({
        files: { odometer_photo: [photo] },
        uploadType: "odometerPhotos",
        businessId: fuel.businessId,
      });

      if (!photos) return;

      formData.set("photoKey", photos[0].key);
    }

    // The ids, the links that changed, the location only when moved and the
    // exact stored km when untouched (applyFuelEdit, tested).
    applyFuelEdit(formData, { record: fuel, values, selectedLinks, location });

    return dispatch(formData);
  };

  const heading = wizardHeading(wizard.step, "update");
  const errors = state.updateFuelError;

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetUpload();
            onClose();
          }
        }}
      >
        <DialogScrollContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{heading.title}</DialogTitle>
            <DialogDescription>{heading.description}</DialogDescription>
          </DialogHeader>

          {wizard.step === "select-branch" ? (
            <SelectBranchStep
              businessId={fuel.businessId}
              handleUpdateSearchBranchInputValue={wizard.selectBranch}
              onContinue={() => wizard.goTo("select-vehicle-driver")}
              commandBranchInputValue={wizard.selection.branch}
              errorBranchId={errors?.branchId}
            />
          ) : wizard.step === "select-vehicle-driver" ? (
            <SelectVehicleDriverStep
              businessId={fuel.businessId}
              commandVehicleInputValue={wizard.selection.vehicle}
              commandDriverInputValue={wizard.selection.driver}
              handleUpdateSearchVehicleInputValue={wizard.selectVehicle}
              handleUpdateSearchDriverInputValue={wizard.selectDriver}
              onContinue={() => wizard.goTo("select-fuel-type")}
              onBack={() => wizard.goTo("select-branch")}
              errorDriverId={errors?.driverId}
              errorVehicleId={errors?.vehicleId}
            />
          ) : wizard.step === "select-fuel-type" ? (
            <SelectFuelTypeStep
              businessId={fuel.businessId}
              commandFuelTypeInputValue={wizard.selection.fuelType}
              handleUpdateSearchFuelTypeInputValue={wizard.selectFuelType}
              onContinue={() => wizard.goTo("form")}
              onBack={() => wizard.goTo("select-vehicle-driver")}
              errorFuelTypeId={errors?.fuelTypeId}
            />
          ) : (
            <form action={submit} noValidate>
              <UpdateFuelFormStep
                state={state}
                fuel={fuel}
                vehicleId={selectedLinks.vehicleId || fuel.vehicleId}
                values={values}
                linksChanged={Object.keys(changedLinks).length > 0}
                onBack={(typed) => {
                  setValues(typed);
                  wizard.goTo("select-fuel-type");
                }}
                onValuesChange={setValues}
                photo={photo}
                setPhoto={setPhoto}
                photoError={photoError}
                setPhotoError={setPhotoError}
                location={location}
                setLocation={(latitude, longitude) =>
                  setLocationState({ latitude, longitude })
                }
                isLocating={isLocating}
                setIsLocating={setIsLocating}
                onShowPhoto={() => setShowPhoto(true)}
                uploadProgress={uploadProgress}
                uploadError={uploadError}
              />
            </form>
          )}
        </DialogScrollContent>
      </Dialog>

      {showPhoto && fuel.odometer_photo && (
        <Dialog open={showPhoto} onOpenChange={setShowPhoto}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Foto do odômetro</DialogTitle>
              <DialogDescription>
                Foto do odômetro registrada neste abastecimento.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              <Image
                src={fuel.odometer_photo}
                alt="Foto do odômetro"
                width={800}
                height={600}
                className="max-h-96 max-w-full rounded-lg object-contain"
                // Same reason as the preview: a signed storage URL.
                unoptimized
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export { UpdateFuelDialog };
