import { Button, buttonVariants } from "@/components/ui/button";
import type { SelectBranchStepProps } from "./select-branch-step.types";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

import { SearchBranch } from "@/app/(protected)/_components/shared/searches/search-branch";

const SelectBranchStep = ({
  handleUpdateSearchBranchInputValue,
  commandBranchInputValue: { searchBranchInputValue, branchId },
  onContinue,
  businessId,
  errorBranchId,
  searchBranchIsOptional = false,
}: SelectBranchStepProps) => {
  return (
    <div className="space-y-6">
      {searchBranchInputValue && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {searchBranchInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Filial:</span>
                <span className="w-full truncate">
                  {searchBranchInputValue}
                </span>
              </div>

              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchBranchInputValue({
                    branchId: "",
                    searchBranchInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className={"grid grid-cols-1 gap-4"}>
        <SearchBranch
          errorBranchId={errorBranchId}
          searchBranchInputValue={searchBranchInputValue}
          businessId={businessId}
          handleUpdateSearchBranchInputValue={
            handleUpdateSearchBranchInputValue
          }
          isOptional={searchBranchIsOptional}
        />
      </div>

      <div className="flex justify-end mt-6">
        <Button
          type="button"
          onClick={onContinue}
          disabled={!searchBranchIsOptional && !branchId}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

export { SelectBranchStep };
