import { Button, buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

import { SearchVehicle } from "@/app/(protected)/_components/shared/searches/search-vehicle";
import { SearchDriver } from "@/app/(protected)/_components/shared/searches/search-driver";

import type { SelectVehicleDriverStepProps } from "./select-vehicle-driver-step.types";

const SelectVehicleDriverStep = ({
  businessId,
  commandVehicleInputValue,
  commandDriverInputValue,
  handleUpdateSearchVehicleInputValue,
  handleUpdateSearchDriverInputValue,
  onContinue,
  onBack,
  errorVehicleId,
  errorDriverId,
  searchVehicleIsOptional = false,
  searchDriverIsOptional = false,
}: SelectVehicleDriverStepProps) => {
  return (
    <div className="space-y-6">
      {(commandVehicleInputValue.searchVehicleInputValue ||
        commandDriverInputValue.searchDriverInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {commandVehicleInputValue.searchVehicleInputValue && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Veículo:</span>
                <span className="w-full truncate">
                  {commandVehicleInputValue.searchVehicleInputValue}{" "}
                  {commandVehicleInputValue.vehicleLicensePlate && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Placa: {commandVehicleInputValue.vehicleLicensePlate})
                    </span>
                  )}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchVehicleInputValue({
                    vehicleId: "",
                    searchVehicleInputValue: "",
                    vehicleLicensePlate: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}

          {commandDriverInputValue.searchDriverInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Motorista:</span>
                <span className="w-full truncate">
                  {commandDriverInputValue.searchDriverInputValue}{" "}
                  {commandDriverInputValue.driverCnh && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (CNH: {commandDriverInputValue.driverCnh})
                    </span>
                  )}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchDriverInputValue({
                    driverId: "",
                    searchDriverInputValue: "",
                    driverCnh: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <SearchVehicle
            errorVehicleId={errorVehicleId}
            selectedVehicleId={commandVehicleInputValue.vehicleId}
            businessId={businessId}
            handleUpdateSearchVehicleInputValue={
              handleUpdateSearchVehicleInputValue
            }
            isOptional={searchVehicleIsOptional}
          />
        </div>

        <div>
          <SearchDriver
            errorDriverId={errorDriverId}
            selectedDriverId={commandDriverInputValue.driverId}
            businessId={businessId}
            handleUpdateSearchDriverInputValue={
              handleUpdateSearchDriverInputValue
            }
            isOptional={searchDriverIsOptional}
          />
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={
            (!searchVehicleIsOptional && !commandVehicleInputValue.vehicleId) ||
            (!searchDriverIsOptional && !commandDriverInputValue.driverId)
          }
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

export { SelectVehicleDriverStep };
