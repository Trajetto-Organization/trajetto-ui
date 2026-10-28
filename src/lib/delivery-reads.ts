import { relayUrl } from "@/lib/api-relay-paths";
import { relayJson, relayNdjson } from "@/lib/relay-read";

import type { DeliveryDetail } from "@/actions/delivery/get-delivery";
import type { OccurrenceTypeListData } from "@/actions/occurrence-type/list-occurrence-type";
import type { StatusChangeReasonListData } from "@/actions/status-change-reason/list-status-change-reason";

/**
 * The deliveries' reads a dialog makes, from the browser through the relay
 * (lib/relay-read): one delivery's detail and the two catalogues the status
 * dialogs offer.
 *
 * Server Actions until now. Opening "Ver detalhes" asked for the delivery,
 * the occurrence types and the status reasons at once, and Next 14 ran them
 * one after the other. Same paths and token; writes stay Server Actions.
 */

interface ReadOptions {
  signal?: AbortSignal;
}

async function fetchDelivery(
  businessId: string,
  deliveryId: string,
  { signal }: ReadOptions = {},
): Promise<DeliveryDetail> {
  const answer = await relayJson<{ data: DeliveryDetail }>(
    relayUrl(
      `/delivery/get-delivery/${encodeURIComponent(deliveryId)}/business/${encodeURIComponent(businessId)}`,
    ),
    { signal, errorMessage: "Houve um erro ao carregar a entrega." },
  );

  return answer.data;
}

/** One page of a catalogue list (NDJSON: `{ meta }`, then one row a line). */
function catalogueQuery(
  businessId: string,
  page: number,
  pageSize: number,
): URLSearchParams {
  return new URLSearchParams({
    businessId,
    page: String(page),
    pageSize: String(pageSize),
  });
}

async function fetchOccurrenceTypes(
  businessId: string,
  page: number,
  pageSize: number,
  { signal }: ReadOptions = {},
): Promise<OccurrenceTypeListData> {
  const { meta, data } = await relayNdjson<
    OccurrenceTypeListData["data"][number]
  >(
    relayUrl(
      "/occurrence-type/list-occurrence-type",
      catalogueQuery(businessId, page, pageSize),
    ),
    { signal, errorMessage: "Houve um erro ao listar os tipos de ocorrência." },
  );

  return {
    data,
    total: meta?.total ?? data.length,
    currentPage: meta?.page ?? page,
    pageSize: meta?.pageSize ?? pageSize,
    totalPages: meta?.totalPages ?? 1,
  };
}

async function fetchStatusChangeReasons(
  businessId: string,
  page: number,
  pageSize: number,
  { signal }: ReadOptions = {},
): Promise<StatusChangeReasonListData> {
  const { meta, data } = await relayNdjson<
    StatusChangeReasonListData["data"][number]
  >(
    relayUrl(
      "/status-change-reason/list-status-change-reason",
      catalogueQuery(businessId, page, pageSize),
    ),
    { signal, errorMessage: "Houve um erro ao listar os motivos." },
  );

  return {
    data,
    total: meta?.total ?? data.length,
    currentPage: meta?.page ?? page,
    pageSize: meta?.pageSize ?? pageSize,
    totalPages: meta?.totalPages ?? 1,
    meta: meta?.searchMeta,
  } as StatusChangeReasonListData;
}

export { fetchDelivery, fetchOccurrenceTypes, fetchStatusChangeReasons };
