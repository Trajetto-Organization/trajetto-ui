"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader } from "lucide-react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";

import { handleToggleBranchActive } from "@/actions/branch/toggle-branch-active";
import { isStaleActionResult } from "@/lib/action-result";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { refreshAfterBranchWrite } from "../lib/after-write";

interface ToggleBranchActiveCellProps {
  branchId: string;
  businessId: string;
  isActive: boolean;
}

/**
 * The status switch of a row, optimistic with rollback. Disabled without the
 * write permission (the admin copy had no check); a 409 from the API (the
 * status changed meanwhile) rolls back and says so.
 */
function ToggleBranchActiveCell({
  branchId,
  businessId,
  isActive,
}: ToggleBranchActiveCellProps): JSX.Element {
  const canWrite = useHasPermission(permissions.BRANCH_MANAGE, "write");

  const [optimisticActive, setOptimisticActive] = useState(isActive);
  const [isPending, startTransition] = useTransition();

  // A refreshed list (Atualizar, catalogChanged) wins over the local guess.
  useEffect(() => setOptimisticActive(isActive), [isActive]);

  const handleToggle = () => {
    const previous = optimisticActive;
    setOptimisticActive(!previous);

    startTransition(async () => {
      const result = await handleToggleBranchActive(branchId, businessId);

      if (isStaleActionResult(result)) {
        setOptimisticActive(previous);
        return;
      }

      if (result.toggleError) {
        setOptimisticActive(previous);
        toast.error(result.toggleError);
        return;
      }

      toast.success(result.successMessage);

      await refreshAfterBranchWrite().catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Switch
          checked={optimisticActive}
          onCheckedChange={handleToggle}
          disabled={isPending || !canWrite}
          aria-label={optimisticActive ? "Inativar filial" : "Ativar filial"}
          title={
            canWrite
              ? undefined
              : "Você não tem permissão para alterar filiais."
          }
          className={cn(
            "transition-colors duration-200",
            optimisticActive
              ? "data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-600"
              : "data-[state=unchecked]:bg-red-300 dark:data-[state=unchecked]:bg-red-900/60",
          )}
        />
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader size={12} className="animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-medium transition-colors duration-200",
          optimisticActive
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        )}
      >
        {optimisticActive ? "Ativa" : "Inativa"}
      </span>
    </div>
  );
}

export { ToggleBranchActiveCell };
