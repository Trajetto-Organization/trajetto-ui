"use client";

import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";
import { RevalidateButtonUI } from "@/app/(protected)/_components/shared/revalidate-button-ui";
import { useRefreshRateLimit } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate/hooks";

/**
 * "Atualizar", for a panel that fetches on the client.
 *
 * Thirty-nine tables in this product refresh through `DataTableRevalidate`,
 * which is rate limited: three presses in thirty seconds and the button locks
 * for fifteen, counting down on its own face. Five panels — the control tower,
 * and all four tabs of Integrações — had their own `<Button onClick={refetch}>`
 * instead, with no limit of any kind. Those are the ones that hit the heaviest
 * reads the product has: a map of every vehicle position, a webhook delivery
 * log, an hourly aggregate over the API usage table.
 *
 * So the rule was real everywhere it was cheap and absent everywhere it was
 * expensive, which is exactly backwards. Same limit, same countdown, same
 * words — the difference is only that the work is a client refetch rather
 * than a server-action revalidation.
 */
interface RefreshButtonProps {
  /**
   * Distinct per panel.
   *
   * The cooldown lives in `localStorage` under this key, which is what makes
   * it survive a reload and hold across tabs of the same panel — and what
   * keeps a cooldown on Webhooks from locking Chaves de API.
   */
  storageKey: string;

  /** Spins the icon while the refetch is in flight. */
  isRefreshing?: boolean;

  label?: string;
  hideLabelOnMobile?: boolean;

  /**
   * Defaults to the page-action size (decision 16.61): h-9 on /admin and
   * /dashboard alike, full width so a phone stacks it.
   */
  className?: string;

  onRefresh: () => void | Promise<void>;
}

const RATE_LIMIT = {
  maxClicks: 3,
  timeWindowMs: 30_000,
  cooldownTimeMs: 15_000,
} as const;

const RefreshButton = ({
  storageKey,
  isRefreshing = false,
  label = "Atualizar",
  hideLabelOnMobile = false,
  className,
  onRefresh,
}: RefreshButtonProps): JSX.Element => {
  const pageActionClassName = usePageActionClassName();

  const { isRateLimited, cooldownRemaining, registerClick } =
    useRefreshRateLimit({ ...RATE_LIMIT, storageKey });

  return (
    <RevalidateButtonUI
      isLoading={isRefreshing}
      isRateLimited={isRateLimited}
      cooldownRemaining={cooldownRemaining}
      label={label}
      hideLabelOnMobile={hideLabelOnMobile}
      className={className ?? pageActionClassName}
      onClick={() => {
        // The click is registered first and its verdict is obeyed: a refused
        // click must not reach the network, or the limit is decoration.
        if (!registerClick()) return;

        void onRefresh();
      }}
    />
  );
};

export { RefreshButton, RATE_LIMIT };
