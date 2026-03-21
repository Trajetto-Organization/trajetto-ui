import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { X } from "lucide-react";

import type { SelectBusinessStepProps } from "./select-business-step.types";
import { SearchBusiness } from "@/app/(protected)/_components/shared/searches/search-business";

const SelectBusinessStep = ({
  commandBusinessInputValue,
  handleUpdateSearchBusinessInputValue,
  onContinue,
  errorBusinessId,
}: SelectBusinessStepProps) => {
  return (
    <div className="space-y-6">
      {commandBusinessInputValue.searchBusinessInputValue && (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-dashed truncate h-8 text-center max-w-96 block leading-4",
            )}
          >
            {commandBusinessInputValue.searchBusinessInputValue}
          </div>
          <Button
            className="h-8 w-4"
            variant="ghost"
            onClick={() =>
              handleUpdateSearchBusinessInputValue({
                businessId: "",
                searchBusinessInputValue: "",
              })
            }
          >
            <X />
          </Button>
        </div>
      )}

      <SearchBusiness
        errorBusinessId={errorBusinessId}
        searchBusinessInputValue={
          commandBusinessInputValue.searchBusinessInputValue
        }
        handleUpdateSearchBussinessInputValue={
          handleUpdateSearchBusinessInputValue
        }
      />

      <div className="flex justify-end mt-6">
        <Button
          type="button"
          onClick={onContinue}
          disabled={!commandBusinessInputValue.searchBusinessInputValue}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

export { SelectBusinessStep };
