import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { X } from "lucide-react";

import { SearchServiceOrder } from "@/app/(protected)/_components/search-service-order";
import { SelectServiceOrderStepProps } from "../dto";

const SelectServiceOrderStep = ({
  businessId,
  commandServiceOrderInputValue,
  handleUpdateSearchServiceOrderInputValue,
  onContinue,
  onBack,
  errorServiceOrderId,
  searchServiceOrderIsOptional = false,
}: SelectServiceOrderStepProps) => {
  return (
    <div className="space-y-6">
      {/* Display selected Service Order if any */}
      {commandServiceOrderInputValue.searchServiceOrderInputValue && (
        <div className="grid grid-cols-1 w-full">
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
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {/* Service Order Selection (Optional) */}
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

          {searchServiceOrderIsOptional && (
            <p className="text-sm text-muted-foreground mt-2">
              Este campo é opcional. Você pode prosseguir sem selecionar uma
              ordem de serviço.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          disabled={
            !searchServiceOrderIsOptional &&
            !commandServiceOrderInputValue.serviceOrderId
          }
          onClick={onContinue}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

export { SelectServiceOrderStep };
