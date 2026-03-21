import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { X } from "lucide-react";

import { SearchDriver } from "@/app/(protected)/_components/shared/searches/search-driver";
import { SearchVehicleType } from "@/app/(protected)/_components/shared/searches/search-vehicle-type";

import type { SelectDriverVehicleTypeStepProps } from "./select-driver-vehicle-type-step.types";

const SelectDriverVehicleTypeStep = ({
  businessId,
  commandDriverInputValue,
  commandVehicleTypeInputValue,
  handleUpdateSearchDriverInputValue,
  handleUpdateSearchVehicleTypeInputValue,
  onContinue,
  onBack,
  errorDriverId,
  errorVehicleTypeId,
  searchDriverIsOptional = false,
  searchVehicleTypeIsOptional = false,
}: SelectDriverVehicleTypeStepProps) => {
  return (
    <div className="space-y-6">
      {(commandDriverInputValue.searchDriverInputValue ||
        commandVehicleTypeInputValue.searchVehicleTypeInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {commandDriverInputValue.searchDriverInputValue && (
            <div className="flex items-center gap-2">
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

          {commandVehicleTypeInputValue.searchVehicleTypeInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Tipo de Veículo:</span>
                <span className="w-full truncate">
                  {commandVehicleTypeInputValue.searchVehicleTypeInputValue}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchVehicleTypeInputValue({
                    vehicleTypeId: "",
                    searchVehicleTypeInputValue: "",
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
        {/* Driver Selection (Optional) */}
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

        {/* Vehicle Type Selection (Optional) */}
        <div>
          <SearchVehicleType
            errorVehicleTypeId={errorVehicleTypeId}
            searchVehicleTypeInputValue={
              commandVehicleTypeInputValue.searchVehicleTypeInputValue
            }
            businessId={businessId}
            handleUpdateSearchVehicleTypeInputValue={
              handleUpdateSearchVehicleTypeInputValue
            }
            isOptional={searchVehicleTypeIsOptional}
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
            (!searchDriverIsOptional && !commandDriverInputValue.driverId) ||
            (!searchVehicleTypeIsOptional &&
              !commandVehicleTypeInputValue.vehicleTypeId)
          }
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

export { SelectDriverVehicleTypeStep };
