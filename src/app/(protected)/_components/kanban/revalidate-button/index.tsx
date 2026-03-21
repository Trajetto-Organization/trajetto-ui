"use client";

import { useState } from "react";
import { toast } from "sonner";

import { RevalidateButtonUI } from "@/app/(protected)/_components/shared/revalidate-button-ui";
import { useDataButtonRevalidation } from "../../hooks/revalidation-button";

import { useKanbanQueryClient } from "../hooks/query-client";

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
  const { invalidateKanbanQueries } = useKanbanQueryClient();

  const { isRateLimited, cooldownRemaining, registerClick } =
    useDataButtonRevalidation(null, rateLimit);

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

  return (
    <RevalidateButtonUI
      isLoading={isLoading}
      isRateLimited={isRateLimited}
      cooldownRemaining={cooldownRemaining}
      className="whitespace-nowrap"
      size="default"
      type="button"
      onClick={handleRevalidate}
    />
  );
};

export { KanbanRevalidationButton };
