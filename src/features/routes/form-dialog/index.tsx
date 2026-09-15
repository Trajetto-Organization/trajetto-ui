"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { DialogScrollContent } from "@/components/ui/dialog";

import { handleCreateRoute } from "@/actions/route/create-route";
import { handleUpdateRoute } from "@/actions/route/update-route";

import type { RouteDetail } from "@/actions/route/get-route";

import { RouteFormDialogSubmit } from "./submit";
import { useRouteForm } from "./hooks";

interface RouteFormState {
  successMessage?: string;
  createRouteError?: Record<string, string[] | string>;
  updateRouteError?: Record<string, string[] | string>;
}

interface RouteFormDialogProps {
  businessId: string;
  isOpen: boolean;
  onClose: () => void;

  /** Present = editing. Absent = planning a new day. */
  route?: RouteDetail | null;
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
}: RouteFormDialogProps): JSX.Element => {
  const isEditing = route != null;

  const [state, dispatch] = useFormState<RouteFormState, FormData>(
    isEditing ? handleUpdateRoute : handleCreateRoute,
    {},
  );

  const { formRef } = useRouteForm({ state, onClose, isEditing });

  // Controlled fields do not take defaultValue, so they are seeded here, and
  // on every open — the dialog is mounted conditionally so this runs fresh.
  const [driverId, setDriverId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;

    setDriverId(route?.driverId ?? "");
    setVehicleId(route?.vehicleId ?? "");

    setScheduledDate(
      route?.scheduled_date?.slice(0, 10) ??
        new Date().toISOString().slice(0, 10),
    );
  }, [isOpen, route]);

  const submitRouteForm = (routeFormData: FormData) => {
    routeFormData.append("businessId", businessId);

    if (isEditing) routeFormData.append("routeId", route.id);

    return dispatch(routeFormData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogScrollContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar a rota ${route.code}` : "Planejar rota"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "O motorista, o veículo e a data podem mudar enquanto a rota não sair."
              : "A rota nasce em planejamento: nada chega ao motorista até você liberá-la."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={submitRouteForm}>
          <RouteFormDialogSubmit
            businessId={businessId}
            route={route}
            state={state}
            driverId={driverId}
            setDriverId={setDriverId}
            vehicleId={vehicleId}
            setVehicleId={setVehicleId}
            scheduledDate={scheduledDate}
            setScheduledDate={setScheduledDate}
            onCancel={onClose}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { RouteFormDialog };
export type { RouteFormState };
