"use client";

import { useEffect, useState } from "react";
import { Loader, UserPlus } from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { assignDeliveries } from "@/actions/delivery/assign-deliveries";
import { revalidateTagName } from "@/actions/revalidate";

import type { DeliveryListItem } from "@/actions/delivery/get-delivery";

import { DriverSelector } from "../driver-selector";
import { VehicleSelector } from "../vehicle-selector";

interface AssignDeliveriesDialogProps {
  businessId: string;
  /** The PENDING deliveries checked on the table. */
  deliveries: DeliveryListItem[];
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful assignment — clears the table selection. */
  onAssigned: () => void;
}

const SUMMARY_LIMIT = 3;

/**
 * Batch assignment straight from the table selection. Assigning never
 * changes status: the deliveries become "Designada" (Pendente + motorista)
 * and only move to Em rota when the driver starts the route in the app.
 */
const AssignDeliveriesDialog = ({
  businessId,
  deliveries,
  isOpen,
  onClose,
  onAssigned,
}: AssignDeliveriesDialogProps): JSX.Element => {
  const [driverId, setDriverId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");

  const [initialPair, setInitialPair] = useState<{
    driverId: string;
    vehicleId: string;
  }>({ driverId: "", vehicleId: "" });

  const [isPending, setIsPending] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    // When every selected delivery already shares the same pair, the
    // dialog opens showing it and the button stays disabled until
    // something changes — the same rule every update dialog follows.
    // Mixed selections start empty.
    const driverIds = new Set(
      deliveries.map((delivery) => delivery.driver?.id ?? ""),
    );
    const vehicleIds = new Set(
      deliveries.map((delivery) => delivery.vehicle?.id ?? ""),
    );

    const sharedDriverId = driverIds.size === 1 ? [...driverIds][0] : "";
    const sharedVehicleId = vehicleIds.size === 1 ? [...vehicleIds][0] : "";

    setDriverId(sharedDriverId);
    setVehicleId(sharedVehicleId);

    setInitialPair({ driverId: sharedDriverId, vehicleId: sharedVehicleId });
    // The parent rebuilds the deliveries array every render; isOpen is the
    // snapshot moment, so re-seeding mid-edit never wipes the user's pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const count = deliveries.length;
  const plural = count > 1 ? "s" : "";

  const isDirty =
    driverId !== initialPair.driverId || vehicleId !== initialPair.vehicleId;

  // Pre-seeded values may not be inside the selector's loaded pages yet;
  // the rows themselves know the names to show meanwhile.
  const fallbackDriverName = deliveries.find(
    (delivery) => delivery.driver?.id === driverId,
  )?.driver?.name;

  const fallbackVehiclePlate = deliveries.find(
    (delivery) => delivery.vehicle?.id === vehicleId,
  )?.vehicle?.license_plate;

  const summaryNames = deliveries
    .slice(0, SUMMARY_LIMIT)
    .map((delivery) => delivery.recipient_name);

  const remaining = count - summaryNames.length;

  const handleAssign = async () => {
    if (!driverId) return;

    setIsPending(true);

    try {
      const result = await assignDeliveries(
        businessId,
        deliveries.map((delivery) => delivery.id),
        driverId,
        vehicleId || undefined,
      );

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      await revalidateTagName("update-delivery");

      onAssigned();
      onClose();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-5 w-5 shrink-0" />
            Atribuir Motorista e Veículo
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            As entregas selecionadas ficam designadas para o motorista, mas
            continuam pendentes: elas só entram Em rota quando ele iniciar a
            rota pelo aplicativo. Repetir a atribuição substitui o par
            anterior.
          </DialogDescription>
        </DialogHeader>

        <div
          className="rounded-lg border bg-muted/40 p-3 text-sm
          text-muted-foreground"
        >
          <span className="font-medium text-foreground">
            {count} entrega{plural} selecionada{plural}:
          </span>{" "}
          {summaryNames.join(", ")}
          {remaining > 0 && ` e mais ${remaining}`}
        </div>

        {initialPair.driverId !== "" && (
          <p className="text-xs text-muted-foreground">
            A seleção já está designada para o par abaixo — o botão habilita
            quando algo mudar.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 mt-2">
          <DriverSelector
            businessId={businessId}
            value={driverId}
            onChange={setDriverId}
            fallbackLabel={fallbackDriverName}
            disabled={isPending}
          />

          <VehicleSelector
            businessId={businessId}
            value={vehicleId}
            onChange={setVehicleId}
            fallbackLabel={fallbackVehiclePlate}
            disabled={isPending}
          />
        </div>

        <div className="flex gap-2 mt-6 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={isPending || !driverId || !isDirty}
            className="flex-1"
          >
            <span>
              Atribuir {count} entrega{plural}
            </span>
            {isPending && (
              <div className="ml-2 animate-spin">
                <Loader />
              </div>
            )}
          </Button>
        </div>
      </DialogScrollContent>
    </Dialog>
  );
};

export { AssignDeliveriesDialog };
