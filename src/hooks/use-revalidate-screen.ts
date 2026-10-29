"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { queryClientProps } from "@/lib/query-client-props";
import {
  DATA_REVALIDATED_EVENT,
  refreshClientCache,
} from "@/lib/refresh-client-cache";

/**
 * What every "Atualizar" of a page does: the whole tab.
 *
 * - `router.refresh()` re-renders the server content. The protected tree runs
 *   under `fetchCache = "only-no-store"`, so there is no Data Cache for a tag
 *   to clear; the server action with `revalidateTag` that did this before
 *   produced the same render plus a POST and a tag-manifest write per click.
 * - The react-query cache is refreshed as a whole (see refreshClientCache):
 *   a page's dialogs read catalogues no per-page list ever kept up with.
 * - `data-revalidated` reaches state kept outside react-query.
 *
 * `isRevalidating` lasts until the new server tree is on screen (the refresh
 * runs in a transition) and the refetches have answered.
 */
function useRevalidateScreen() {
  const router = useRouter();

  const [isRendering, startTransition] = useTransition();
  const [isRefetching, setIsRefetching] = useState<boolean>(false);

  const revalidate = useCallback(async () => {
    startTransition(() => {
      router.refresh();
    });

    window.dispatchEvent(new CustomEvent(DATA_REVALIDATED_EVENT));

    setIsRefetching(true);

    try {
      await refreshClientCache(queryClientProps);
    } finally {
      setIsRefetching(false);
    }
  }, [router]);

  return { revalidate, isRevalidating: isRendering || isRefetching };
}

export { useRevalidateScreen };
