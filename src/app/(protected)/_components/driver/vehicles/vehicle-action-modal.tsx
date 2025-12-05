"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Car, ChevronRight, Wrench } from "lucide-react";

interface VehicleActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    license_plate: string;
  } | null;
  onViewFuels: (vehicleId: string) => void;
  onViewServiceOrders: (vehicleId: string) => void;
}

const VehicleActionModal = ({
  isOpen,
  onClose,
  vehicle,
  onViewFuels,
  onViewServiceOrders,
}: VehicleActionModalProps): JSX.Element => {
  if (!vehicle) return <></>;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {vehicle.brand} {vehicle.model}
          </DialogTitle>
          <DialogDescription
            className="text-sm 
            text-muted-foreground"
          >
            Placa: {vehicle.license_plate}
          </DialogDescription>
        </DialogHeader>

        <hr />

        <div className="space-y-2">
          <p
            className="text-sm font-medium 
            text-gray-700 mb-3"
          >
            Selecione uma opção:
          </p>

          <Button
            variant="outline"
            className="w-full h-auto py-4 px-4
            group hover:bg-accent"
            onClick={() => {
              onViewFuels(vehicle.id);
              onClose();
            }}
          >
            <div className="flex items-center gap-3 w-full">
              <div
                className="flex-shrink-0 bg-blue-500
                rounded-full p-2 flex items-center justify-center"
              >
                <Car className="h-5 w-5 text-white" />
              </div>
              <div
                className="flex flex-col
                items-start text-left flex-1"
              >
                <span className="font-semibold text-base">
                  Ver abastecimentos do veículo
                </span>
                <span
                  className="text-xs font-normal
                  text-muted-foreground"
                >
                  Visualizar histórico de abastecimentos
                </span>
              </div>
              <ChevronRight
                className="h-5 w-5 text-muted-foreground
                flex-shrink-0 transition-transform
                group-hover:translate-x-1"
              />
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full h-auto py-4 px-4
            group hover:bg-accent"
            onClick={() => {
              onViewServiceOrders(vehicle.id);
              onClose();
            }}
          >
            <div className="flex items-center gap-3 w-full">
              <div
                className="flex-shrink-0 bg-green-500
                rounded-full p-2 flex items-center justify-center"
              >
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div
                className="flex flex-col
                items-start text-left flex-1"
              >
                <span className="font-semibold text-base">
                  Ver ordens de serviço do veículo
                </span>
                <span
                  className="text-xs font-normal
                  text-muted-foreground"
                >
                  Visualizar histórico de manutenções
                </span>
              </div>
              <ChevronRight
                className="h-5 w-5 text-muted-foreground
                flex-shrink-0 transition-transform
                group-hover:translate-x-1"
              />
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { VehicleActionModal };
