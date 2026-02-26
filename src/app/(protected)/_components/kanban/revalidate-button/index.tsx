"use client";

import { useState, useEffect } from "react";
import { Clock, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { useKanbanQueryClient } from "../hooks/use-query-client";
import { useDataButtonRevalidation } from "../../hooks/revalidation-button";

interface KanbanRevalidationButtonProps {
  businessId?: string;
  rateLimit?: {
    maxClicks?: number;
    timeWindowMs?: number;
    cooldownTimeMs?: number;
    storageKey?: string;
  };
}

const KanbanRevalidationButton = ({
  businessId,
  rateLimit = {
    maxClicks: 3,
    timeWindowMs: 30000,
    cooldownTimeMs: 15000,
    storageKey: "kanban-revalidation",
  },
}: KanbanRevalidationButtonProps): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const { invalidateKanbanQueries } = useKanbanQueryClient();

  const { isRateLimited, cooldownRemaining, registerClick } =
    useDataButtonRevalidation(null, rateLimit);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleRevalidate = async () => {
    const canProceed = registerClick();
    if (!canProceed) {
      return;
    }

    setIsLoading(true);

    try {
      await invalidateKanbanQueries(businessId);
    } catch (error: any) {
      toast.error("Erro ao atualizar o board");
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || isRateLimited;
  const displayCooldown =
    isRateLimited && cooldownRemaining <= 0 ? 1 : cooldownRemaining;

  return (
    <Button
      variant="outline"
      onClick={handleRevalidate}
      disabled={isDisabled}
      className="whitespace-nowrap"
    >
      {!isMounted ? (
        <span>Atualizar</span>
      ) : isRateLimited ? (
        <>
          Aguarde {displayCooldown}s
          <Clock className="ml-2 h-4 w-4" />
        </>
      ) : (
        <>
          <RefreshCw
            className={`h-4 w-4 mr-2 flex-shrink-0 ${isLoading ? "animate-spin" : ""}`}
          />
          <span>Atualizar</span>
        </>
      )}
    </Button>
  );
};

export { KanbanRevalidationButton };
