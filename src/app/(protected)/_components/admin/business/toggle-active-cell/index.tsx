"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";

import { handleToggleBusinessActive } from "@/actions/business/toggle-business-active";

import { toast } from "sonner";
import { Loader } from "lucide-react";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

interface ToggleActiveCellProps {
  businessId: string;
  isActive: boolean;
  corporateReason: string;
}

export function ToggleBusinessActiveCell({
  businessId,
  isActive,
  corporateReason,
}: ToggleActiveCellProps): JSX.Element {
  const [optimisticActive, setOptimisticActive] = useState(isActive);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const previousState = optimisticActive;
    setOptimisticActive(!optimisticActive);

    startTransition(async () => {
      const result = await handleToggleBusinessActive(businessId);

      if (result.toggleError) {
        setOptimisticActive(previousState);
        toast.error(result.toggleError);
        return;
      }

      toast.success(result.successMessage);

      await Promise.all([
        revalidateTagName("toggle-business-active"),
        queryClientProps.resetQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) && query.queryKey[0] === "business",
        }),
      ]);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Switch
          checked={optimisticActive}
          onCheckedChange={handleToggle}
          disabled={isPending}
          className={`${
            optimisticActive
              ? "data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-600"
              : "data-[state=unchecked]:bg-red-300 dark:data-[state=unchecked]:bg-red-900/60"
          } transition-colors duration-200`}
        />
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader size={12} className="animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      <span
        className={`
          text-xs font-medium px-2 py-0.5 rounded-full transition-colors duration-200 ${
            optimisticActive
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
      >
        {optimisticActive ? "Ativo" : "Inativo"}
      </span>
    </div>
  );
}
