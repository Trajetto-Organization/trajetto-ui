"use client";

import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";
import { RefreshButton } from "@/components/shared/custom/refresh-button";

import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";

/**
 * The tower's Atualizar, in the page's action slot (UI-TWR-3).
 *
 * The same refresh as every other screen (decision 2.1): the whole tab —
 * the tower AND the trail of the driver that is open, which used to stay as
 * it was when the driver was clicked. Rate limited like the tables, since
 * this is the heaviest read a dispatcher can repeat by hand.
 */
const ControlTowerPageActions = (): JSX.Element => {
  const className = usePageActionClassName();

  const { revalidate, isRevalidating } = useRevalidateScreen();

  return (
    <PageActions>
      <div data-tutorial="control-tower-refresh">
        <RefreshButton
          storageKey="control-tower-panel"
          isRefreshing={isRevalidating}
          onRefresh={revalidate}
          className={className}
        />
      </div>
    </PageActions>
  );
};

export { ControlTowerPageActions };
