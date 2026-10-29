import { useQuery } from "react-query";

import { fetchDelivery } from "@/lib/delivery-reads";
import { relayAnswer } from "@/lib/relay-read";

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
    // A relay GET (lib/delivery-reads) beside the dialog's catalogues. A
    // refusal is an answer the dialog's own error block says, instead of a
    // spinner that never ends.
    ({ signal }) =>
      relayAnswer(
        fetchDelivery(businessId, deliveryId, { signal }),
        "Ocorreu um erro inesperado ao carregar a entrega.",
      ),
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
