import { Button, buttonVariants } from "@/components/ui/button";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

import type { SelectBusinessBranchStepProps } from "./select-business-branch-step.types";

import { SearchBusiness } from "@/app/(protected)/_components/shared/searches/search-business";
import { SearchBranch } from "@/app/(protected)/_components/shared/searches/search-branch";

const SelectBusinessBranchStep = ({
  handleUpdateSearchBusinessInputValue,
  handleUpdateSearchBranchInputValue,
  commandBusinessInputValue: { searchBusinessInputValue, businessId },
  commandBranchInputValue: { searchBranchInputValue, branchId },
  onContinue,
  errorBusinessId,
  errorBranchId,
  searchBranchIsOptional = false,
}: SelectBusinessBranchStepProps): JSX.Element => {
  return (
    <div className="space-y-6">
      {(searchBranchInputValue || searchBusinessInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {searchBusinessInputValue && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Empresa:</span>
                <span className="w-full truncate">
                  {searchBusinessInputValue}
                </span>
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

      <div
        className={`grid ${
          searchBusinessInputValue
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1"
        } gap-4`}
      >
        <SearchBusiness
          handleUpdateSearchBussinessInputValue={
            handleUpdateSearchBusinessInputValue
          }
          searchBusinessInputValue={searchBusinessInputValue}
          errorBusinessId={errorBusinessId}
        />

        {searchBusinessInputValue && (
          <SearchBranch
            errorBranchId={errorBranchId}
            searchBranchInputValue={searchBranchInputValue}
            businessId={businessId}
            handleUpdateSearchBranchInputValue={
              handleUpdateSearchBranchInputValue
            }
            isOptional={searchBranchIsOptional}
          />
        )}
      </div>

      <div className="flex justify-end mt-6">
        <Button
          type="button"
          onClick={onContinue}
          disabled={
            !searchBusinessInputValue || (!searchBranchIsOptional && !branchId)
          }
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

export { SelectBusinessBranchStep };
