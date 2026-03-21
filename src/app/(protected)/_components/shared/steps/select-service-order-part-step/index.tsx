import { Button, buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

import { SearchServiceOrder } from "@/app/(protected)/_components/shared/searches/search-service-order";
import { SearchPart } from "@/app/(protected)/_components/shared/searches/search-part";

import type { SelectServiceOrderPartStepProps } from "./select-service-order-part-step.types";

const SelectServiceOrderPartStep = ({
  businessId,
  commandServiceOrderInputValue,
  commandPartInputValue,
  handleUpdateSearchServiceOrderInputValue,
  handleUpdateSearchPartInputValue,
  onContinue,
  onBack,
  errorServiceOrderId,
  errorPartId,
  searchServiceOrderIsOptional = false,
  searchPartIsOptional = false,
}: SelectServiceOrderPartStepProps) => {
  return (
    <div className="space-y-6">
      {(commandServiceOrderInputValue.searchServiceOrderInputValue ||
        commandPartInputValue.searchPartInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {commandServiceOrderInputValue.searchServiceOrderInputValue && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Ordem de Serviço:</span>
                <span className="w-full truncate">
                  {commandServiceOrderInputValue.searchServiceOrderInputValue}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchServiceOrderInputValue({
                    serviceOrderId: "",
                    searchServiceOrderInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}

          {commandPartInputValue.searchPartInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Peça:</span>
                <span className="w-full truncate">
                  {commandPartInputValue.searchPartInputValue}
                </span>
              </div>
              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchPartInputValue({
                    partId: "",
                    searchPartInputValue: "",
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
        {/* Service Order Selection */}
        <div>
          <SearchServiceOrder
            errorServiceOrderId={errorServiceOrderId}
            searchServiceOrderInputValue={
              commandServiceOrderInputValue.searchServiceOrderInputValue
            }
            businessId={businessId}
            handleUpdateSearchServiceOrderInputValue={
              handleUpdateSearchServiceOrderInputValue
            }
            isOptional={searchServiceOrderIsOptional}
          />
        </div>

        {/* Part Selection */}
        <div>
          <SearchPart
            errorPartId={errorPartId}
            searchPartInputValue={commandPartInputValue.searchPartInputValue}
            businessId={businessId}
            handleUpdateSearchPartInputValue={handleUpdateSearchPartInputValue}
            isOptional={searchPartIsOptional}
          />
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack}>
            Voltar
          </Button>
        )}
        <Button
          type="button"
          onClick={onContinue}
          disabled={
            (!searchServiceOrderIsOptional &&
              !commandServiceOrderInputValue.serviceOrderId) ||
            (!searchPartIsOptional && !commandPartInputValue.partId)
          }
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

export { SelectServiceOrderPartStep };
