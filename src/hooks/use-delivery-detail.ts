import { useQuery } from "react-query";

import { getDelivery } from "@/actions/delivery/get-delivery";
import { STALE_ACTION_MESSAGE, isStaleActionResult } from "@/lib/action-result";

/**
 * One delivery as "Ver detalhes" shows it: status, history, proof.
 *
 * Asked again on every open. It sat on the global five-minute `staleTime`, so
 * a status changed by a colleague (or by this tab's own edit, cancel or
 * assignment, which never touched this key) reopened as it was (REV-12,
 * DLV-EDIT-3). Operational data, read one record at a time: the request is
 * cheap and being wrong is not.
 */
function useDeliveryDetail(businessId: string, deliveryId: string) {
  return useQuery(
    ["delivery-detail", deliveryId],
    async () => {
      const answer = await getDelivery(businessId, deliveryId);

      // Said in the dialog's own error block, instead of a spinner that
      // never ends.
      if (isStaleActionResult(answer, { background: true })) {
        const stale: typeof answer = {
          success: false,
          message: STALE_ACTION_MESSAGE,
        };

        return stale;
      }

      return answer;
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 0,

      // Keyed by delivery: another delivery's status must not stand in for
      // this one's while it loads.
      keepPreviousData: false,
    },
  );
}

export { useDeliveryDetail };
