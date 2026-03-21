import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { X } from "lucide-react";

import type { SelectViolationCodeStepProps } from "./select-violation-code-step.types";
import { SearchTrafficViolationCode } from "@/app/(protected)/_components/shared/searches/search-traffic-violation-code";

const SelectViolationCodeStep = ({
  commandTrafficViolationCodeInputValue,
  handleUpdateSearchTrafficViolationCodeInputValue,
  onContinue,
  onBack,
  errorTrafficViolationCodeId,
  searchTrafficViolationCodeIsOptional = false,
}: SelectViolationCodeStepProps) => {
  return (
    <div className="space-y-6">
      {commandTrafficViolationCodeInputValue.searchTrafficViolationCodeInputValue && (
        <div className="grid grid-cols-1 w-full">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-dashed truncate h-8 text-left",
              )}
            >
              <span>Código de Infração:</span>
              <span className="w-full truncate">
                <span className="text-xs text-muted-foreground ml-1">
                  {
                    commandTrafficViolationCodeInputValue.searchTrafficViolationCodeInputValue
                  }
                </span>
              </span>
            </div>
            <Button
              className="h-8 w-4"
              variant="ghost"
              onClick={() =>
                handleUpdateSearchTrafficViolationCodeInputValue({
                  trafficViolationCodeId: "",
                  searchTrafficViolationCodeInputValue: "",
                  violationCode: "",
                })
              }
            >
              <X />
            </Button>
          </div>
        </div>
      )}

      <SearchTrafficViolationCode
        errorTrafficViolationCodeId={errorTrafficViolationCodeId}
        searchTrafficViolationCodeInputValue={
          commandTrafficViolationCodeInputValue.searchTrafficViolationCodeInputValue
        }
        handleUpdateSearchTrafficViolationCodeInputValue={
          handleUpdateSearchTrafficViolationCodeInputValue
        }
        isOptional={searchTrafficViolationCodeIsOptional}
      />

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={
            !searchTrafficViolationCodeIsOptional &&
            !commandTrafficViolationCodeInputValue.trafficViolationCodeId
          }
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

export { SelectViolationCodeStep };
