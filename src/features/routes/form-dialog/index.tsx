"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { handleCreateRoute } from "@/actions/route/create-route";
import { handleUpdateRoute } from "@/actions/route/update-route";

import type { RouteDetail } from "@/actions/route/get-route";

import { guardFormAction } from "@/lib/action-result";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { localDateKey } from "@/lib/format-values";
import { changedRouteFields } from "@/schemas/create-update-route-schema";

import {
  useApplySuggestion,
  useAssignmentPreview,
  useVehiclePreselection,
} from "../assignment-preview";

import { suggestionToApply } from "../lib/assignment";

import { RouteFormDialogSubmit } from "./submit";
import { useRouteForm } from "./hooks";

interface RouteFormState {
  successMessage?: string;

  /** The route a create made (or replayed), for "Abrir rota". */
  createdRoute?: { id: string; code: number };

  createRouteError?: Record<string, string[] | string>;
  updateRouteError?: Record<string, string[] | string>;
}

interface RouteFormDialogProps {
  businessId: string;
  isOpen: boolean;
  onClose: () => void;

  /** Present = editing. Absent = planning a new day. */
  route?: RouteDetail | null;

  /**
   * Create mode only: the deliveries the new route is born with, in this
   * order (the deliveries table's "Adicionar à rota → Nova rota").
   */
  deliveryIds?: string[];

  /**
   * Create mode only: who takes over after the route exists (the table's
   * dialog moves deliveries into it). Absent, the dialog offers "Abrir rota".
   */
  onCreated?: (created: { id: string; code: number }) => void | Promise<void>;

  /**
   * Edit mode: the edit met a plan newer than the one it was opened on
   * (409 ROUTE_PLAN_STALE). The page reloads instead of a silent overwrite.
   */
  onConflict?: (message: string) => void | Promise<void>;
}

/**
 * What a route held when the dialog opened: the seed of the controlled
 * fields and the reference of the dirty check. The day is the civil day the
 * API serves as UTC midnight; a new route defaults to today on THIS calendar
 * (decision 1.3) — `toISOString()` was the UTC day, tomorrow from 21:00 in
 * São Paulo.
 */
function initialRouteValues(route: RouteDetail | null) {
  return {
    name: route?.name ?? "",
    destination: route?.destination ?? "",
    driverId: route?.driverId ?? "",
    vehicleId: route?.vehicleId ?? "",
    scheduledDate: route?.scheduled_date?.slice(0, 10) ?? localDateKey(),
    plannedDeparture: route?.planned_departure_at ?? "",
    plannedArrival: route?.planned_arrival_at ?? "",
  };
}

/** The fields of the posted form that differ from what the route held. */
function routeEditChanges(
  formData: FormData,
  initial: ReturnType<typeof initialRouteValues>,
): string[] {
  const values = Object.fromEntries(
    [...formData.entries()].filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );

  return changedRouteFields(values, {
    name: initial.name,
    destination: initial.destination,
    driverId: initial.driverId,
    vehicleId: initial.vehicleId,
    scheduled_date: initial.scheduledDate,
    planned_departure_at: initial.plannedDeparture,
    planned_arrival_at: initial.plannedArrival,
  });
}

/**
 * One dialog for planning a route and for editing one.
 *
 * Deliberately does NOT pick the deliveries. Choosing which addresses go on a
 * route, in which order, is its own job with its own screen — the stops
 * dialog — and folding a multi-select in here would mean two pickers for one
 * decision, one of which could not reorder. A route is born empty and filled
 * from the row action right next to it.
 *
 * Status is not here either: releasing, departing and cancelling each carry
 * rules an open-ended form could not express.
 */
const RouteFormDialog = ({
  businessId,
  isOpen,
  onClose,
  route = null,
  deliveryIds,
  onCreated,
  onConflict,
}: RouteFormDialogProps): JSX.Element => {
  const isEditing = route != null;

  const [state, dispatch] = useFormState<RouteFormState, FormData>(
    guardFormAction(isEditing ? handleUpdateRoute : handleCreateRoute),
    {},
  );

  const { formRef } = useRouteForm({
    state,
    onClose,
    isEditing,
    businessId,
    onCreated,
    onConflict,
  });

  // A double click or a resend after a lost answer creates ONE route
  // (decision 14.7, §4.7).
  const idempotencyKeyFor = useIdempotencyKey(state);

  const initial = useMemo(() => initialRouteValues(route), [route]);

  // Controlled fields do not take defaultValue, so they are seeded here, and
  // on every open — the dialog is mounted conditionally so this runs fresh.
  const [driverId, setDriverId] = useState<string>(initial.driverId);
  const [scheduledDate, setScheduledDate] = useState<string>(
    initial.scheduledDate,
  );
  const [plannedDeparture, setPlannedDeparture] = useState<string>(
    initial.plannedDeparture,
  );
  const [plannedArrival, setPlannedArrival] = useState<string>(
    initial.plannedArrival,
  );

  const vehicle = useVehiclePreselection(initial.vehicleId);
  const { reset: resetVehicle } = vehicle;

  useEffect(() => {
    if (!isOpen) return;

    setDriverId(initial.driverId);
    setScheduledDate(initial.scheduledDate);
    setPlannedDeparture(initial.plannedDeparture);
    setPlannedArrival(initial.plannedArrival);
    resetVehicle(initial.vehicleId);
  }, [isOpen, initial, resetVehicle]);

  const preview = useAssignmentPreview({
    businessId,
    driverId,
    vehicleId: vehicle.vehicleId,
    scheduledDate,
    excludeRouteId: route?.id,
  });

  // The driver's own truck, when there is exactly one and nobody chose
  // another (FLEET-ASSIGN-2) — on an edit, only once the driver changed.
  useApplySuggestion(
    suggestionToApply({
      suggestedVehicleId: preview.data?.suggestedVehicleId,
      isEditing,
      driverId,
      initialDriverId: initial.driverId,
    }),
    vehicle.applySuggestion,
  );

  const handleDriverChange = (next: string) => {
    setDriverId(next);
    vehicle.onDriverChanged();
  };

  const submitRouteForm = (routeFormData: FormData) => {
    routeFormData.append("businessId", businessId);

    if (!isEditing) {
      if (deliveryIds?.length) {
        routeFormData.set("deliveryIds", JSON.stringify(deliveryIds));
      }

      routeFormData.set("idempotency_key", idempotencyKeyFor(routeFormData));
    }

    if (isEditing) {
      routeFormData.append("routeId", route.id);

      // A partial update, as the API takes it: the window is judged only
      // when the edit touches it, so a route whose stored times predate the
      // rule can still be renamed.
      routeFormData.append(
        "changed_fields",
        routeEditChanges(routeFormData, initial).join(","),
      );

      // The plan this dialog was opened on (D5): two dispatchers editing the
      // crew no longer end in a silent last-write-wins.
      if (typeof route.plan_version === "number") {
        routeFormData.append(
          "expected_plan_version",
          String(route.plan_version),
        );
      }
    }

    return dispatch(routeFormData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* max-w-xl: the footer fills the row, Cancelar and the main action
          side by side, like Criar Embarcador (decision 3.2). */}
      <DialogScrollContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? `Editar a rota ${route.code}` : "Planejar rota"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "O motorista, o veículo, a data e os horários podem mudar enquanto a rota não sair."
              : "A rota nasce em planejamento: nada chega ao motorista até você liberá-la."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={submitRouteForm} noValidate data-route-form>
          <RouteFormDialogSubmit
            businessId={businessId}
            route={route}
            state={state}
            driverId={driverId}
            setDriverId={handleDriverChange}
            vehicleId={vehicle.vehicleId}
            setVehicleId={vehicle.chooseVehicle}
            scheduledDate={scheduledDate}
            setScheduledDate={setScheduledDate}
            plannedDeparture={plannedDeparture}
            setPlannedDeparture={setPlannedDeparture}
            plannedArrival={plannedArrival}
            setPlannedArrival={setPlannedArrival}
            preview={preview.data}
            previewError={preview.error}
            formRef={formRef}
            initial={initial}
            isOpen={isOpen}
            onCancel={onClose}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { RouteFormDialog, initialRouteValues, routeEditChanges };
export type { RouteFormState };
