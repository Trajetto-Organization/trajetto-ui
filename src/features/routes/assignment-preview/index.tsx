"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "react-query";
import { TriangleAlert, Truck } from "lucide-react";

import {
  getAssignmentPreview,
  type AssignmentPreview,
  type AssignmentPreviewParams,
} from "@/actions/route/assignment-preview";
import { isStaleActionResult } from "@/lib/action-result";

import { vehicleStatusLabel, vehicleToPreselect } from "../lib/assignment";

/**
 * The vehicle field of an assignment: the driver's own truck is preselected
 * when there is exactly one (FLEET-ASSIGN-2), and a choice somebody made —
 * or the vehicle the dialog opened with — is never replaced.
 *
 * `onDriverChanged` drops a vehicle that was only ever the PREVIOUS driver's
 * suggestion, so the new driver's own truck can take its place.
 */
function useVehiclePreselection(initialVehicleId: string) {
  const [vehicleId, setVehicleId] = useState<string>(initialVehicleId);
  const [touched, setTouched] = useState<boolean>(Boolean(initialVehicleId));
  const [autoPicked, setAutoPicked] = useState<boolean>(false);

  /** Back to what the dialog opened with (a fresh open). */
  const reset = useCallback((next: string) => {
    setVehicleId(next);
    setTouched(Boolean(next));
    setAutoPicked(false);
  }, []);

  /** Offer the preview's suggestion; taken only when nobody chose. */
  const applySuggestion = useCallback(
    (suggestedVehicleId: string | null | undefined) => {
      const next = vehicleToPreselect({
        suggestedVehicleId,
        currentVehicleId: vehicleId,
        vehicleTouched: touched,
      });

      if (next) {
        setVehicleId(next);
        setAutoPicked(true);
      }
    },
    [vehicleId, touched],
  );

  const chooseVehicle = useCallback((next: string) => {
    setVehicleId(next);
    setTouched(true);
    setAutoPicked(false);
  }, []);

  const onDriverChanged = useCallback(() => {
    if (autoPicked) {
      setVehicleId("");
      setAutoPicked(false);
    }
  }, [autoPicked]);

  return { vehicleId, applySuggestion, chooseVehicle, onDriverChanged, reset };
}

/** Wires a preview's suggestion into a preselection. */
function useApplySuggestion(
  suggestedVehicleId: string | null | undefined,
  applySuggestion: (suggested: string | null | undefined) => void,
): void {
  useEffect(() => {
    applySuggestion(suggestedVehicleId);
  }, [suggestedVehicleId, applySuggestion]);
}

/**
 * What a driver/vehicle pair already has, read while the dialog is open
 * (FLEET-ASSIGN-2): the driver's own truck to preselect, who is responsible
 * for the chosen one, and the routes either already holds that day.
 *
 * `staleTime: 0`: it describes the operation right now — a truck that left a
 * minute ago is exactly the warning this exists for.
 */
function useAssignmentPreview({
  businessId,
  driverId,
  vehicleId,
  scheduledDate,
  excludeRouteId,
  deliveryIds,
}: Partial<AssignmentPreviewParams>) {
  // Order-independent, so re-rendering the same selection is the same query.
  const selection = deliveryIds?.length
    ? [...deliveryIds].sort().join(",")
    : null;

  return useQuery(
    [
      "route-assignment-preview",
      businessId,
      driverId,
      vehicleId || null,
      scheduledDate || null,
      excludeRouteId || null,
      selection,
    ],
    async (): Promise<AssignmentPreview | null> => {
      const answer = await getAssignmentPreview({
        businessId: businessId!,
        driverId: driverId!,
        vehicleId,
        scheduledDate,
        excludeRouteId,
        deliveryIds: selection ? selection.split(",") : undefined,
      });

      // A tab older than the deploy: the guard says so; nothing to show.
      if (isStaleActionResult(answer, { background: true })) return null;

      if (!answer.success || !answer.data) throw new Error(answer.message);

      return answer.data;
    },
    {
      enabled: Boolean(businessId && driverId),
      staleTime: 0,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );
}

interface AssignmentPreviewNoticeProps {
  preview: AssignmentPreview | null | undefined;
  error?: unknown;
}

/**
 * The chosen vehicle's status and responsible, and every warning, under the
 * vehicle field. Warnings never disable anything: substituting a driver's
 * truck is an ordinary morning.
 */
const AssignmentPreviewNotice = ({
  preview,
  error,
}: AssignmentPreviewNoticeProps): JSX.Element | null => {
  if (error) {
    return (
      <p className="text-xs text-muted-foreground" role="status">
        Não foi possível verificar conflitos deste motorista e veículo agora. A
        atribuição continua possível.
      </p>
    );
  }

  if (!preview) return null;

  const { vehicle, warnings } = preview;

  return (
    <div className="space-y-2" aria-live="polite">
      {vehicle && (
        <p
          className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"
          data-testid="assignment-vehicle-summary"
        >
          <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">
            {vehicle.license_plate} · {vehicleStatusLabel(vehicle.status)} ·{" "}
            {vehicle.responsible
              ? `Responsável: ${vehicle.responsible.name}`
              : "Sem motorista responsável"}
          </span>
        </p>
      )}

      {warnings.length > 0 && (
        <div
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3
          text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30
          dark:text-amber-200"
        >
          <p className="flex items-center gap-2 font-medium">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            Confira antes de confirmar
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-6">
            {warnings.map((warning) => (
              <li key={warning.code} className="break-words">
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export {
  AssignmentPreviewNotice,
  useApplySuggestion,
  useAssignmentPreview,
  useVehiclePreselection,
};
