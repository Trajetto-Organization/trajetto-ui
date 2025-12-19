import { Button, buttonVariants } from "@/components/ui/button";
import { SelectVehicleSupplierStepProps } from "../dto";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

import { SearchVehicle } from "@/app/(protected)/_components/search-vehicle";
import { SearchSupplier } from "@/app/(protected)/_components/search-supplier";

const SelectVehicleSupplierStep = ({
  businessId,
  commandVehicleInputValue,
  commandSupplierInputValue,
  handleUpdateSearchVehicleInputValue,
  handleUpdateSearchSupplierInputValue,
  onContinue,
  onBack,
  errorVehicleId,
  errorSupplierId,
  searchVehicleIsOptional = false,
  searchSupplierIsOptional = false,
}: SelectVehicleSupplierStepProps) => {
  return (
    <div className="space-y-6">
      {/* Show selected vehicle and supplier if any */}
      {(commandVehicleInputValue.searchVehicleInputValue ||
        commandSupplierInputValue.searchSupplierInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {/* Display selected Vehicle if any */}
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

          {/* Display selected Supplier if any */}
          {commandSupplierInputValue.searchSupplierInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Fornecedor:</span>
                <span className="w-full truncate">
                  {commandSupplierInputValue.searchSupplierInputValue}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchSupplierInputValue({
                    supplierId: "",
                    searchSupplierInputValue: "",
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
        {/* Vehicle Selection (Required) */}
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

        {/* Supplier Selection (Optional) */}
        <div>
          <SearchSupplier
            errorSupplierId={errorSupplierId}
            searchSupplierInputValue={
              commandSupplierInputValue.searchSupplierInputValue
            }
            businessId={businessId}
            handleUpdateSearchSupplierInputValue={
              handleUpdateSearchSupplierInputValue
            }
            isOptional={searchSupplierIsOptional}
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
            (!searchSupplierIsOptional && !commandSupplierInputValue.supplierId)
          }
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

export { SelectVehicleSupplierStep };
