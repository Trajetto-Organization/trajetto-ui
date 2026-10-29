"use client";

import { useCallback, useMemo, useState } from "react";

import { isSameOrder, moveTo, reconcileOrder } from "../../lib/stop-order";

/**
 * The order on screen versus the order on the server (decision 14.7, §5.3).
 *
 * The local order is null until the dispatcher moves something; from then on
 * it is what the list and the map show, until "Salvar ordem" or "Descartar".
 * When the server's set of stops changes under it (a colleague added or
 * removed one), the local order no longer describes the route and is
 * dropped — there is no automatic merge of two orders.
 */
function useRoutePlan(serverIds: readonly string[]) {
  const [localIds, setLocalIds] = useState<string[] | null>(null);

  const orderedIds = useMemo(
    () => reconcileOrder(serverIds, localIds),
    [serverIds, localIds],
  );

  const dirty = localIds !== null && !isSameOrder(orderedIds, serverIds);

  const move = useCallback(
    (from: number, to: number) => {
      const next = moveTo(orderedIds, from, to);

      if (next) setLocalIds(next);
    },
    [orderedIds],
  );

  const discard = useCallback(() => setLocalIds(null), []);

  return { orderedIds, dirty, move, discard };
}

export { useRoutePlan };
