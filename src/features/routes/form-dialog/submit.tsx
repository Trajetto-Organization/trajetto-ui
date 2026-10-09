"use client";

import { useMemo, useState, type RefObject } from "react";
import { useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFormDirty } from "@/hooks/use-form-dirty";
import { DialogFormFooter } from "@/components/ui/dialog";
import FormInput from "@/components/shared/custom/form-input";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { DateTimePickerField } from "@/app/(protected)/_components/shared/custom/date-time-picker-field";
import { DriverSelector } from "@/app/(protected)/_components/shared/selectors/driver-selector";
import { VehicleSelector } from "@/app/(protected)/_components/shared/selectors/vehicle-selector";

import type { AssignmentPreview } from "@/actions/route/assignment-preview";
import type { RouteDetail } from "@/actions/route/get-route";

import {
  ROUTE_DESTINATION_MAX,
  ROUTE_NAME_MAX,
  routeFormLiveIssues,
} from "@/schemas/create-update-route-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

import { AssignmentPreviewNotice } from "../assignment-preview";
import { routeDayPickerBounds } from "../lib/route-dates";
import { planTimeZone } from "../lib/assignment";

import type { RouteFormState, initialRouteValues } from "./index";

interface RouteFormDialogSubmitProps {
  businessId: string;
  route: RouteDetail | null;
  state: RouteFormState;

  driverId: string;
  setDriverId: (value: string) => void;

  vehicleId: string;
  setVehicleId: (value: string) => void;

  /** "YYYY-MM-DD". */
  scheduledDate: string;
  setScheduledDate: (value: string) => void;

  /** ISO instants with offset, or "". */
  plannedDeparture: string;
  setPlannedDeparture: (value: string) => void;
  plannedArrival: string;
  setPlannedArrival: (value: string) => void;

  preview: AssignmentPreview | null | undefined;
  previewError: unknown;

  /** The form, for the dirty check (it reads the inputs through it). */
  formRef: RefObject<HTMLFormElement>;

  /** What the record held when the dialog opened. */
  initial: ReturnType<typeof initialRouteValues>;
  isOpen: boolean;

  onCancel: () => void;
}

/**
 * The inner half of the dialog, because `useFormStatus` only reports on the
 * form it is rendered inside — the outer component owns `useFormState` and
 * cannot read `pending`.
 */
const RouteFormDialogSubmit = ({
  businessId,
  route,
  state,
  driverId,
  setDriverId,
  vehicleId,
  setVehicleId,
  scheduledDate,
  setScheduledDate,
  plannedDeparture,
  setPlannedDeparture,
  plannedArrival,
  setPlannedArrival,
  preview,
  previewError,
  formRef,
  initial,
  isOpen,
  onCancel,
}: RouteFormDialogSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  const isEditing = route != null;

  /**
   * Edit only: "Salvar alterações" waits for a change (decision 2.5). Here,
   * inside the form, and not in the dialog: the dialog renders the form in a
   * portal that mounts after the dialog's own effects ran, so a check there
   * found no form and never listened.
   */
  const initialValues = useMemo(
    () => ({ name: initial.name, destination: initial.destination }),
    [initial],
  );

  const isDirty = useFormDirty({
    formRef,
    initialValues,
    isOpen: isOpen && isEditing,
    extraValues: [
      [driverId, initial.driverId],
      [vehicleId, initial.vehicleId],
      [scheduledDate, initial.scheduledDate],
      [plannedDeparture, initial.plannedDeparture],
      [plannedArrival, initial.plannedArrival],
    ],
  });

  // Criar is always enabled (decision 16.701): pressing it says what is
  // missing. Salvar waits for a change (decision 2.5).
  const canSave = canSubmitForm({ isEdit: isEditing, isDirty });

  // Controlled, so live validation reads them; the dialog is mounted on
  // open, so the seed is always the route being edited.
  const [name, setName] = useState<string>(initial.name);
  const [destination, setDestination] = useState<string>(initial.destination);

  const fieldErrors = (
    isEditing ? (state.updateRouteError ?? {}) : (state.createRouteError ?? {})
  ) as Record<string, string[]>;

  // Read by the server action's day rules, which run on the Next server:
  // the company's zone, as the API reads them, once the preview answered.
  const zone = planTimeZone(preview?.timeZone);

  // The departure is picked ON the route's day; the return from it on. The
  // day is the company's, so on this screen's clock it may span two days.
  const routeDay = useMemo(
    () => routeDayPickerBounds(scheduledDate, zone),
    [scheduledDate, zone],
  );

  // Live validation (decision 16.700) with the actions' own rules: every
  // field on create, only what changed on an edit (routeFormLiveIssues).
  const live = useLiveValidation({
    values: {
      name,
      destination,
      driverId,
      vehicleId,
      scheduled_date: scheduledDate,
      planned_departure_at: plannedDeparture,
      planned_arrival_at: plannedArrival,
      plan_time_zone: zone,
    },
    rules: (values) =>
      routeFormLiveIssues(
        values,
        isEditing
          ? {
              name: initial.name,
              destination: initial.destination,
              driverId: initial.driverId,
              vehicleId: initial.vehicleId,
              scheduled_date: initial.scheduledDate,
              planned_departure_at: initial.plannedDeparture,
              planned_arrival_at: initial.plannedArrival,
            }
          : null,
      ),
    fields: [
      "name",
      "destination",
      "scheduled_date",
      "driverId",
      "vehicleId",
      "planned_departure_at",
      "planned_arrival_at",
    ],
    serverErrors: fieldErrors,
    controlIds: { driverId: "driver-selector", vehicleId: "vehicle-selector" },
  });

  return (
    <>
      <input type="hidden" name="plan_time_zone" value={zone} />

      <div ref={live.ref} className="grid gap-4 py-2 sm:grid-cols-2">
        <FormInput
          label="Nome da rota (opcional)"
          htmlfor="name"
          name="name"
          type="text"
          placeholder="Zona Sul — manhã"
          maxLength={ROUTE_NAME_MAX}
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          errorName={live.errorOf("name")}
          disabled={pending}
        />

        <FormInput
          label="Destino (opcional)"
          htmlfor="destination"
          name="destination"
          type="text"
          placeholder="CD Cajamar"
          maxLength={ROUTE_DESTINATION_MAX}
          value={destination}
          onChange={(event) => setDestination(event.currentTarget.value)}
          errorName={live.errorOf("destination")}
          disabled={pending}
        />

        <DatePickerField
          label="Data da rota *"
          htmlfor="scheduled_date"
          name="scheduled_date"
          value={scheduledDate}
          onChange={setScheduledDate}
          errorName={live.errorOf("scheduled_date")}
          disabled={pending}
          // A civil day, "YYYY-MM-DD" (decision 1.3).
          dateOnly
          // A route is planned for tomorrow far more often than for today.
          allowFutureDates
        />

        <DriverSelector
          businessId={businessId}
          value={driverId}
          onChange={setDriverId}
          errorName={live.errorOf("driverId")}
          disabled={pending}
          fallbackLabel={route?.driver?.name}
        />

        <div className="space-y-2 sm:col-span-2">
          <VehicleSelector
            businessId={businessId}
            value={vehicleId}
            onChange={setVehicleId}
            errorName={live.errorOf("vehicleId")}
            disabled={pending}
            fallbackLabel={route?.vehicle?.license_plate}
            chosenDriverId={driverId}
            // Said here rather than discovered at the release: the API
            // refuses a handover without a vehicle, and finding that out at
            // the truck costs a phone call and a morning.
            hint="Opcional no planejamento e obrigatório para liberar a rota ao motorista."
          />

          <AssignmentPreviewNotice preview={preview} error={previewError} />
        </div>

        {/* The selectors are comboboxes, not inputs, so what they chose has to
        reach FormData some other way. */}
        <input type="hidden" name="driverId" value={driverId} />
        <input type="hidden" name="vehicleId" value={vehicleId} />

        <DateTimePickerField
          label="Saída prevista (opcional)"
          htmlfor="planned_departure_at"
          name="planned_departure_at"
          value={plannedDeparture}
          onChange={setPlannedDeparture}
          fromDate={routeDay.fromDate}
          toDate={routeDay.toDate}
          errorName={live.errorOf("planned_departure_at")}
          disabled={pending}
        />

        <DateTimePickerField
          label="Retorno previsto (opcional)"
          htmlfor="planned_arrival_at"
          name="planned_arrival_at"
          value={plannedArrival}
          onChange={setPlannedArrival}
          fromDate={routeDay.fromDate}
          defaultTime="18:00"
          errorName={live.errorOf("planned_arrival_at")}
          disabled={pending}
        />
      </div>

      <DialogFormFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
          {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
        >
          Cancelar
        </Button>

        <Button type="submit" disabled={pending || !canSave}>
          <span>{isEditing ? "Salvar alterações" : "Criar rota"}</span>
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader className="h-4 w-4" />
            </div>
          )}
        </Button>
      </DialogFormFooter>
    </>
  );
};

export { RouteFormDialogSubmit };
