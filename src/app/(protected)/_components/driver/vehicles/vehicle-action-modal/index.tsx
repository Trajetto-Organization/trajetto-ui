"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Car, ChevronRight, Wrench, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { DriverVehicleOptionKey } from "./options";
import type { VehicleActionModalProps } from "./vehicle-action-modal.types";

const OPTION_VISUALS: Record<
  DriverVehicleOptionKey,
  { icon: LucideIcon; className: string }
> = {
  fuels: { icon: Car, className: "bg-blue-500" },
  "service-orders": { icon: Wrench, className: "bg-green-500" },
};

/**
 * The vehicle card's choices. Receives only what this driver may open
 * (`driverVehicleOptions`): the card does not open it at all when there is
 * nothing to offer.
 */
const VehicleActionModal = ({
  isOpen,
  onClose,
  vehicle,
  options,
  onSelect,
}: VehicleActionModalProps): JSX.Element => {
  if (!vehicle || options.length === 0) return <></>;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {vehicle.brand} {vehicle.model}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Placa: {vehicle.license_plate}
          </DialogDescription>
        </DialogHeader>

        <hr />

        <div className="space-y-2">
          <p className="mb-3 text-sm font-medium text-foreground">
            Selecione uma opção:
          </p>

          {options.map((option) => {
            const { icon: Icon, className } = OPTION_VISUALS[option.key];

            return (
              <Button
                key={option.key}
                variant="outline"
                className="group h-auto w-full px-4 py-4 hover:bg-accent"
                onClick={() => {
                  onSelect(option.hrefFor(vehicle.id));
                  onClose();
                }}
              >
                <div className="flex w-full items-center gap-3">
                  <div
                    className={`flex flex-shrink-0 items-center justify-center
                    rounded-full p-2 ${className}`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                    <span className="text-base font-semibold">
                      {option.title}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 flex-shrink-0 text-muted-foreground
                    transition-transform group-hover:translate-x-1"
                  />
                </div>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { VehicleActionModal };
