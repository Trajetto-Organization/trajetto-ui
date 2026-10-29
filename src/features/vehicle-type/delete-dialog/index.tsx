"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { handleDeleteVehicleType } from "@/actions/vehicle-type/delete-vehicle-type";
import { isStaleActionResult } from "@/lib/action-result";
import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";

import type { VehicleTypeRow } from "../types";

interface VehicleTypeDeleteDialogProps {
  businessId: string;
  vehicleType: VehicleTypeRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VehicleTypeDeleteDialog = ({
  businessId,
  vehicleType,
  open,
  onOpenChange,
}: VehicleTypeDeleteDialogProps): JSX.Element => {
  const [isPending, setIsPending] = useState<boolean>(false);
  const { revalidate } = useRevalidateScreen();

  const confirm = async () => {
    setIsPending(true);

    try {
      const result = await handleDeleteVehicleType({
        businessId,
        vehicleTypeId: vehicleType.id,
      });

      if (isStaleActionResult(result)) return;

      if (result.deleteVehicleTypeError) {
        toast.error(result.deleteVehicleTypeError);
        return;
      }

      toast.success(result.successMessage ?? "Tipo de veículo excluído.");
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
      title="Excluir tipo de veículo"
      destructive
      confirmLabel="Excluir tipo"
      isPending={isPending}
      onConfirm={confirm}
      description={
        <>
          <p>
            O tipo <strong>{vehicleType.description}</strong> será excluído
            permanentemente.
          </p>
          <p className="font-medium text-foreground">
            Validações e consequências:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              A exclusão é recusada enquanto houver veículos com este tipo —
              troque o tipo deles antes. Hoje:{" "}
              {vehicleType._count?.vehicles ?? 0} veículo(s).
            </li>
            <li>
              A ação fica registrada nas atividades e não pode ser desfeita.
            </li>
          </ul>
        </>
      }
    />
  );
};

export { VehicleTypeDeleteDialog };
