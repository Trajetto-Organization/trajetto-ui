"use client";

import { useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { DriverSelector } from "@/app/(protected)/_components/shared/selectors/driver-selector";
import { VehicleSelector } from "@/app/(protected)/_components/shared/selectors/vehicle-selector";

import type { RouteDetail } from "@/actions/route/get-route";
import type { RouteFormState } from "./index";

interface RouteFormDialogSubmitProps {
  businessId: string;
  route: RouteDetail | null;
  state: RouteFormState;

  driverId: string;
  setDriverId: (value: string) => void;

  vehicleId: string;
  setVehicleId: (value: string) => void;

  scheduledDate: string;
  setScheduledDate: (value: string) => void;

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
  onCancel,
}: RouteFormDialogSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  const isEditing = route != null;

  const fieldErrors = (isEditing
    ? (state.updateRouteError ?? {})
    : (state.createRouteError ?? {})) as Record<string, string[]>;

  return (
    <>
      <div className="grid gap-4 py-2 sm:grid-cols-2">
        <FormInput
          label="Nome da rota"
          htmlfor="name"
          name="name"
          type="text"
          placeholder="Zona Sul — manhã"
          maxLength={80}
          defaultValue={route?.name ?? ""}
          errorName={fieldErrors.name}
          disabled={pending}
        />

        <DatePickerField
          label="Data da rota *"
          htmlfor="scheduled_date"
          name="scheduled_date"
          value={scheduledDate}
          onChange={setScheduledDate}
          errorName={fieldErrors.scheduled_date}
          disabled={pending}
          // A route is planned for tomorrow far more often than for today.
          allowFutureDates
        />

        <DriverSelector
          businessId={businessId}
          value={driverId}
          onChange={setDriverId}
          errorName={fieldErrors.driverId}
          disabled={pending}
          fallbackLabel={route?.driver?.name}
        />

        <VehicleSelector
          businessId={businessId}
          value={vehicleId}
          onChange={setVehicleId}
          errorName={fieldErrors.vehicleId}
          disabled={pending}
          fallbackLabel={route?.vehicle?.license_plate}
        />

        {/* The selectors are comboboxes, not inputs, so what they chose has to
        reach FormData some other way. */}
        <input type="hidden" name="driverId" value={driverId} />
        <input type="hidden" name="vehicleId" value={vehicleId} />

        <FormInput
          label="Saída prevista"
          htmlfor="planned_departure_at"
          name="planned_departure_at"
          type="datetime-local"
          defaultValue={route?.planned_departure_at?.slice(0, 16) ?? ""}
          errorName={fieldErrors.planned_departure_at}
          disabled={pending}
        />

        <FormInput
          label="Retorno previsto"
          htmlfor="planned_arrival_at"
          name="planned_arrival_at"
          type="datetime-local"
          defaultValue={route?.planned_arrival_at?.slice(0, 16) ?? ""}
          errorName={fieldErrors.planned_arrival_at}
          disabled={pending}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {/* Said here rather than discovered at the release: the API refuses a
        handover without a vehicle, and finding that out at the truck costs a
        phone call and a morning. */}
        O veículo é opcional no planejamento e obrigatório para liberar a rota
        ao motorista.
      </p>

      <div className="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>

        <Button type="submit" disabled={pending || !driverId || !scheduledDate}>
          <span>{isEditing ? "Salvar alterações" : "Criar rota"}</span>
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader className="h-4 w-4" />
            </div>
          )}
        </Button>
      </div>
    </>
  );
};

export { RouteFormDialogSubmit };
