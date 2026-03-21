import { Button, buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

import type { SelectUserStepProps } from "./select-user-step.types";
import { SearchUser } from "@/app/(protected)/_components/shared/searches/search-user";

const SelectUserStep = ({
  businessId,
  commandUserInputValue,
  handleUpdateSearchUserInputValue,
  onContinue,
  onBack,
  errorUserId,
  searchUserIsOptional = false,
}: SelectUserStepProps) => {
  return (
    <div className="space-y-6">
      {/* Display selected User if any */}
      {commandUserInputValue.searchUserInputValue && (
        <div className="grid grid-cols-1 w-full">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-dashed truncate h-8 text-left",
              )}
            >
              <span>Usuário Responsável:</span>
              <span className="w-full truncate">
                {commandUserInputValue.searchUserInputValue}{" "}
                {commandUserInputValue.responsibleUserEmail && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (E-mail: {commandUserInputValue.responsibleUserEmail})
                  </span>
                )}
              </span>
            </div>
            <Button
              className="h-8 w-4"
              variant="ghost"
              onClick={() =>
                handleUpdateSearchUserInputValue({
                  userId: "",
                  searchUserInputValue: "",
                  responsibleUserEmail: "",
                })
              }
            >
              <X />
            </Button>
          </div>
        </div>
      )}

      {/* User Selection (Required) */}
      <SearchUser
        errorUserId={errorUserId}
        selectedUserId={commandUserInputValue.userId}
        businessId={businessId}
        handleUpdateSearchUserInputValue={handleUpdateSearchUserInputValue}
        isOptional={searchUserIsOptional}
      />

      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={!searchUserIsOptional && !commandUserInputValue.userId}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

export { SelectUserStep };
