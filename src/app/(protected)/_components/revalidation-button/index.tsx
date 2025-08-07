import { useFormState, useFormStatus } from "react-dom";
import { Clock, RefreshCw } from "lucide-react";

import { useEffect, useState } from "react";

import { handleRevalidateData } from "@/actions/revalidate-data";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import { useDataButtonRevalidation } from "../hooks/revalidation-button";

type RevalidateDataProps =
  | "update-notification"
  | "update-entity-count"
  | "update-vehicle-status"
  | "update-maintenance-stats"
  | "update-recent-activity"
  | "update-vehicle-by-type"
  | "update-maintenance-costs"
  | "update-vehicle-count"
  | "update-driver-count"
  | "update-business-count"
  | "update-branch-count"
  | "update-part-count"
  | "update-supplier-count"
  | "update-service-order-count"
  | "update-user-count"
  | "update-fine-count";

interface DataButtonRevalidateProps {
  revalidateData: RevalidateDataProps[];
  rateLimit?: {
    maxClicks?: number;
    timeWindowMs?: number;
    cooldownTimeMs?: number;
    storageKey?: string; // Custom key for localStorage
  };
  className?: string;
}

const DataButtonRevalidationContainer = ({
  isRateLimited,
  cooldownRemaining,
  className,
}: {
  isRateLimited: boolean;
  cooldownRemaining: number;
  className?: string;
}) => {
  const { pending } = useFormStatus();
  const isDisabled = pending || isRateLimited;

  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const displayCooldown =
    isRateLimited && cooldownRemaining <= 0 ? 1 : cooldownRemaining;

  return (
    <Button
      variant="outline"
      size="sm"
      type="submit"
      disabled={isDisabled}
      className={cn("whitespace-nowrap", className)}
      data-revalidate
    >
      {!isMounted ? (
        <>
          <span>Atualizar</span>
        </>
      ) : isRateLimited ? (
        <>
          Aguarde {displayCooldown}s
          <Clock className="ml-2 h-4 w-4" />
        </>
      ) : (
        <>
          <RefreshCw
            className={`h-4 w-4 mr-2 flex-shrink-0 ${pending ? "animate-spin" : ""}`}
          />
          <span>Atualizar</span>
        </>
      )}
    </Button>
  );
};

const ButtonRevalidation = ({
  revalidateData,
  rateLimit,
  className, // Nova prop
}: DataButtonRevalidateProps) => {
  const [state, dispatch] = useFormState(
    async (prevState: any, formData: FormData) =>
      await handleRevalidateData(revalidateData),
    null,
  );

  const { isRateLimited, cooldownRemaining, registerClick } =
    useDataButtonRevalidation(state, rateLimit);

  const rateLimitedDispatch = (formData: FormData) => {
    const canProceed = registerClick();
    if (canProceed) {
      dispatch(formData);
    }
  };

  return (
    <form action={rateLimitedDispatch} className={cn("w-full", className)}>
      <DataButtonRevalidationContainer
        isRateLimited={isRateLimited}
        cooldownRemaining={cooldownRemaining}
        className="w-full sm:w-auto"
      />
    </form>
  );
};

export { ButtonRevalidation };
