import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { X } from "lucide-react";

import { SearchFuelType } from "@/app/(protected)/_components/search-fuel-type";
import { SelectFuelTypeStepProps } from "../dto";

const SelectFuelTypeStep = ({
  businessId,
  commandFuelTypeInputValue,
  handleUpdateSearchFuelTypeInputValue,
  onContinue,
  onBack,
  errorFuelTypeId,
  searchFuelTypeIsOptional = false,
}: SelectFuelTypeStepProps) => {
  return (
    <div className="space-y-6">
      {commandFuelTypeInputValue.searchFuelTypeInputValue && (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-dashed truncate h-8 text-left",
            )}
          >
            <span>Combustível:</span>
            <span className="w-full truncate">
              {commandFuelTypeInputValue.searchFuelTypeInputValue}
            </span>
          </div>
          <Button
            className="h-8 w-4"
            variant="ghost"
            onClick={() =>
              handleUpdateSearchFuelTypeInputValue({
                fuelTypeId: "",
                searchFuelTypeInputValue: "",
              })
            }
          >
            <X />
          </Button>
        </div>
      )}

      <SearchFuelType
        errorFuelTypeId={errorFuelTypeId}
        searchFuelTypeInputValue={
          commandFuelTypeInputValue.searchFuelTypeInputValue
        }
        businessId={businessId}
        handleUpdateSearchFuelTypeInputValue={
          handleUpdateSearchFuelTypeInputValue
        }
        isOptional={searchFuelTypeIsOptional}
      />

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={
            !searchFuelTypeIsOptional && !commandFuelTypeInputValue.fuelTypeId
          }
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

export { SelectFuelTypeStep };
