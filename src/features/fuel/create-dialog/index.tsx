"use client";

import dynamic from "next/dynamic";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";
import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";
import { SelectVehicleDriverStep } from "@/app/(protected)/_components/shared/steps/select-vehicle-driver-step";
import { SelectFuelTypeStep } from "@/app/(protected)/_components/shared/steps/select-fuel-type-step";
import { useFetchVehicleData } from "@/app/(protected)/_components/shared/searches/search-vehicle-by-id-business";
import { UploadProgress } from "@/components/shared/upload-progress";

import { handleCreateFuel } from "@/actions/fuel/create-fuel";
import { guardFormAction } from "@/lib/action-result";
import { createUpdateFuelSchema } from "@/schemas/create-update-fuel-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  useLiveValidation,
} from "@/components/shared/live-validation";
import { appendDataToForm } from "@/lib/append-data-form";
import { usePhotoUpload } from "@/hooks/use-photo-upload";

import { useFuelWritePermissions } from "../hooks/use-fuel-permissions";
import { FuelFields, type FuelFieldErrors } from "../form/fuel-fields";
import {
  EMPTY_FUEL_FORM,
  useFuelInputs,
  type FuelFormValues,
} from "../form/use-fuel-inputs";
import {
  FuelRulesAlert,
  LocationField,
  VehicleSummary,
} from "../form/context-panels";
import { useFuelWizard, wizardHeading } from "../form/use-fuel-wizard";
import { refreshAfterFuelWrite } from "../form/after-write";
import {
  FUEL_CONTROL_IDS,
  FUEL_FIELDS,
  fuelMileageNote,
  fuelSchemaValues,
  odometerPhotoIssue,
} from "../lib/live-rules";
import { PhotoFieldLoading } from "@/components/shared/custom/photo-field-loading";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

// Its own chunk (react-dropzone): loaded with this dialog, not with the page.
const PhotoDropzone = dynamic(
  () => import("../form/photo-dropzone").then((module) => module.PhotoDropzone),
  { ssr: false, loading: PhotoFieldLoading },
);

interface CreateFuelErrors extends FuelFieldErrors {
  vehicleId?: string[];
  driverId?: string[];
  fuelTypeId?: string[];
  branchId?: string[];
  businessId?: string[];
  odometer_photo?: string[];
  latitude?: string[];
  longitude?: string[];
  createFuelErrorMessage?: string;
}

interface CreateFuelState {
  createFuelError?: CreateFuelErrors;
  successMessage?: string;
}

interface CreateFuelFormStepProps {
  state: CreateFuelState;
  businessId: string;
  vehicleId: string;
  values: FuelFormValues;
  onBack: (values: FuelFormValues) => void;
  photo: File | null;
  setPhoto: (file: File | null) => void;
  photoError: string | null;
  setPhotoError: (error: string | null) => void;
  location: { latitude: number | null; longitude: number | null };
  setLocation: (latitude: number, longitude: number) => void;
  isLocating: boolean;
  setIsLocating: (value: boolean) => void;
  uploadProgress: { uploaded: number; total: number } | null;
  uploadError: string | null;
}

/** The last step: inside the <form>, so useFormStatus sees the submit. */
const CreateFuelFormStep = ({
  state,
  businessId,
  vehicleId,
  values,
  onBack,
  photo,
  setPhoto,
  photoError,
  setPhotoError,
  location,
  setLocation,
  isLocating,
  setIsLocating,
  uploadProgress,
  uploadError,
}: CreateFuelFormStepProps): JSX.Element => {
  const { pending } = useFormStatus();
  const inputs = useFuelInputs(values);

  const { data: vehicle, isLoading: isLoadingVehicle } = useFetchVehicleData({
    vehicleId,
    businessId,
  });

  const serverErrors = state.createFuelError;
  const busy = pending || isLoadingVehicle || isLocating;

  // Live validation (decision 16.700): the action's schema on the numbers
  // the form posts, and the required photo in the action's words.
  const live = useLiveValidation({
    schema: createUpdateFuelSchema,
    values: fuelSchemaValues(inputs.values),
    rules: () => ({
      odometer_photo: odometerPhotoIssue({
        photo,
        fileError: photoError,
        required: true,
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

  return (
    <div ref={live.ref} className="mt-2 space-y-5">
      <FuelRulesAlert mode="create" />
      <VehicleSummary vehicle={vehicle} />

      <FuelFields
        inputs={inputs}
        errors={errors}
        disabled={pending}
        mileageHint={fuelMileageNote(
          inputs.values.current_mileage,
          vehicle?.current_mileage,
        )}
      />

      <PhotoDropzone
        label="Foto do odômetro *"
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
      />

      <LocationField
        latitude={location.latitude}
        longitude={location.longitude}
        onLocationChange={setLocation}
        onLoadingChange={setIsLocating}
        disabled={pending}
        error={serverErrors?.latitude?.[0] || serverErrors?.longitude?.[0]}
      />

      <UploadProgress progress={uploadProgress} error={uploadError} />

      {/* A wizard: "Voltar" is the previous step here, not a cancel. */}
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
        <Button type="submit" disabled={busy}>
          <span>Criar Abastecimento</span>
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </DialogFormFooter>
    </div>
  );
};

/**
 * "Criar Abastecimento", one dialog for /admin and /dashboard (decision 8.7).
 *
 * The company comes from the page (`businessId`): the selector's on /admin,
 * the session's on /dashboard. The button stays visible without the
 * permission and says why on hover, as in every other module — the admin
 * copy had no check at all, relying on the MASTER holding everything.
 */
const CreateFuelDialog = ({
  businessId,
}: {
  businessId: string;
}): JSX.Element => {
  const [state, dispatch] = useFormState<CreateFuelState, FormData>(
    guardFormAction(handleCreateFuel),
    {},
  );

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [values, setValues] = useState<FuelFormValues>(EMPTY_FUEL_FORM);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [location, setLocationState] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const { uploadProgress, uploadError, resetUpload, uploadPhotos } =
    usePhotoUpload();

  const wizard = useFuelWizard();
  const permissionsRequired = useFuelWritePermissions();
  const buttonClassName = usePageActionClassName();

  const handledRef = useRef<CreateFuelState | null>(null);

  const resetAll = () => {
    wizard.reset();
    setValues(EMPTY_FUEL_FORM);
    setPhoto(null);
    setPhotoError(null);
    setLocationState({ latitude: null, longitude: null });
    setIsLocating(false);
    resetUpload();
  };

  useEffect(() => {
    if (!state || handledRef.current === state) return;

    handledRef.current = state;

    if (state.createFuelError?.createFuelErrorMessage) {
      toast.error(state.createFuelError.createFuelErrorMessage);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);

      void refreshAfterFuelWrite("create-fuel").catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );

      setIsOpen(false);
      resetAll();
    }
    // resetAll only touches setters and the wizard's stable reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const submit = async (formData: FormData) => {
    const { branch, vehicle, driver, fuelType } = wizard.selection;

    if (photo) {
      // The photo goes straight to storage; only its key reaches the action.
      const photos = await uploadPhotos({
        files: { odometer_photo: [photo] },
        uploadType: "odometerPhotos",
        businessId,
      });

      // Upload failed and the error is already on screen.
      if (!photos) return;

      formData.set("photoKey", photos[0].key);
    }

    appendDataToForm(formData, {
      businessId,
      branchId: branch.branchId,
      vehicleId: vehicle.vehicleId,
      driverId: driver.driverId,
      fuelTypeId: fuelType.fuelTypeId,
      ...(location.latitude !== null && {
        latitude: String(location.latitude),
      }),
      ...(location.longitude !== null && {
        longitude: String(location.longitude),
      }),
    });

    return dispatch(formData);
  };

  const heading = wizardHeading(wizard.step, "create");
  const errors = state.createFuelError;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetAll();
      }}
    >
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
                  className={buttonClassName}
                  disabled={!permissionsRequired.hasAllPermissions}
                >
                  <CreateButtonLabel>Criar Abastecimento</CreateButtonLabel>
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

      <DialogScrollContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{heading.title}</DialogTitle>
          <DialogDescription>{heading.description}</DialogDescription>
        </DialogHeader>

        {wizard.step === "select-branch" ? (
          <SelectBranchStep
            businessId={businessId}
            handleUpdateSearchBranchInputValue={wizard.selectBranch}
            onContinue={() => wizard.goTo("select-vehicle-driver")}
            commandBranchInputValue={wizard.selection.branch}
            errorBranchId={errors?.branchId}
          />
        ) : wizard.step === "select-vehicle-driver" ? (
          <SelectVehicleDriverStep
            businessId={businessId}
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
            businessId={businessId}
            commandFuelTypeInputValue={wizard.selection.fuelType}
            handleUpdateSearchFuelTypeInputValue={wizard.selectFuelType}
            onContinue={() => wizard.goTo("form")}
            onBack={() => wizard.goTo("select-vehicle-driver")}
            errorFuelTypeId={errors?.fuelTypeId}
          />
        ) : (
          <form action={submit} noValidate>
            <CreateFuelFormStep
              state={state}
              businessId={businessId}
              vehicleId={wizard.selection.vehicle.vehicleId}
              values={values}
              onBack={(typed) => {
                // Kept, so coming back to the form does not lose the typing.
                setValues(typed);
                wizard.goTo("select-fuel-type");
              }}
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
              uploadProgress={uploadProgress}
              uploadError={uploadError}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateFuelDialog };
