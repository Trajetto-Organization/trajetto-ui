"use client";

import { toast } from "sonner";

import { RevalidateButtonUI } from "@/app/(protected)/_components/shared/revalidate-button-ui";
import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";

import { useButtonRefreshRateLimit } from "../../hooks/revalidation-button";

interface KanbanRevalidationButtonProps {
  /** Kept for the callers; Atualizar refreshes the whole tab (decision 2.1). */
  businessId?: string;
  rateLimit?: {
    maxClicks?: number;
    timeWindowMs?: number;
    cooldownTimeMs?: number;
    storageKey?: string;
  };
}

/**
 * The board's Atualizar. It used to invalidate only the Kanban queries, so
 * the rest of the tab (the company selector, the user picker, the page's
 * server tree) stayed as it was; it now goes through the one global
 * revalidate (decision 2.1, REV-1): router.refresh, drop what nothing
 * renders, refetch what is on screen. It takes the page actions'
 * height (h-9, decision 16.61) and the full width on a phone.
 */
const KanbanRevalidationButton = ({
  rateLimit = {
    maxClicks: 3,
    timeWindowMs: 30000,
    cooldownTimeMs: 15000,
    storageKey: "kanban-revalidation",
  },
}: KanbanRevalidationButtonProps): JSX.Element => {
  const { revalidate, isRevalidating } = useRevalidateScreen();

  const { isRateLimited, cooldownRemaining, registerClick } =
    useButtonRefreshRateLimit(rateLimit);

  const handleRevalidate = async () => {
    if (!registerClick()) return;

    try {
      await revalidate();
    } catch {
      toast.error("Erro ao atualizar o board");
    }
  };

  return (
    <RevalidateButtonUI
      isLoading={isRevalidating}
      isRateLimited={isRateLimited}
      cooldownRemaining={cooldownRemaining}
      className="h-9 w-full whitespace-nowrap sm:w-auto"
      size="sm"
      type="button"
      onClick={handleRevalidate}
    />
  );
};

export { KanbanRevalidationButton };
