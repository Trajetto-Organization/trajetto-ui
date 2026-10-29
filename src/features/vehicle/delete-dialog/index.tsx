"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { handleDeleteVehicle } from "@/actions/vehicle/delete-vehicle";
import { isStaleActionResult } from "@/lib/action-result";
import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";

import type { VehicleRow } from "../types";

interface VehicleDeleteDialogProps {
  businessId: string;
  vehicle: VehicleRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The checks the API makes before deleting, said before the person confirms:
 * each one answers with the count of what still points at the truck.
 */
const DELETE_CONSEQUENCES = [
  "A exclusão é recusada se houver multas, abastecimentos, ordens de serviço, checklists ou contas a pagar deste veículo — a mensagem diz quantos.",
  "Também é recusada se o veículo tiver entregas ou rotas no histórico da operação.",
  "Para um veículo que saiu da frota, inative-o: ele sai das listas e o histórico fica.",
  "A ação fica registrada nas atividades e não pode ser desfeita.",
];

const VehicleDeleteDialog = ({
  businessId,
  vehicle,
  open,
  onOpenChange,
}: VehicleDeleteDialogProps): JSX.Element => {
  const [isPending, setIsPending] = useState<boolean>(false);
  const { revalidate } = useRevalidateScreen();

  const confirm = async () => {
    setIsPending(true);

    try {
      const result = await handleDeleteVehicle({
        businessId,
        vehicleId: vehicle.id,
      });

      if (isStaleActionResult(result)) return;

      if (result.deleteVehicleError) {
        toast.error(result.deleteVehicleError);
        return;
      }

      toast.success(result.successMessage ?? "Veículo excluído.");
      void revalidate();
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir veículo"
      destructive
      confirmLabel="Excluir veículo"
      isPending={isPending}
      onConfirm={confirm}
      description={
        <>
          <p>
            O veículo <strong>{vehicle.license_plate}</strong> (
            {vehicle.description}) será excluído permanentemente.
          </p>
          <p className="font-medium text-foreground">
            Validações e consequências:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {DELETE_CONSEQUENCES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      }
    />
  );
};

export { VehicleDeleteDialog };
