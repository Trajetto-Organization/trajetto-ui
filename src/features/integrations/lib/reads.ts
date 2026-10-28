import { relayUrl } from "@/lib/api-relay-paths";
import {
  readQuery,
  relayAnswer,
  relayJson,
  relayNdjson,
} from "@/lib/relay-read";

import type {
  ApiKeyRow,
  ApiUsageData,
  MonitorStatusFilter,
  MonitorWindow,
  WebhookDeliveryPage,
  WebhookDeliveryRow,
  WebhookEndpointRow,
} from "@/actions/integration";

/**
 * The integrations panels' reads, from the browser through the relay
 * (lib/relay-read).
 *
 * They were Server Actions, run one at a time by Next: the access check, the
 * keys, the endpoints and the monitor of one tab queued behind each other.
 * Each answers the value the panels already read — `{ success, message,
 * data, code, status }`, a refusal included — so a 403 still draws the
 * access state and a failure its sentence. Writes stay Server Actions.
 */
interface IntegrationAnswer<T> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  status?: number;
}

async function settle<T>(
  read: Promise<T>,
  fallbackMessage: string,
): Promise<IntegrationAnswer<T>> {
  const answer = await relayAnswer(read, fallbackMessage);

  if (answer.success) {
    return { success: true, message: "", data: answer.data };
  }

  return {
    success: false,
    message: answer.message,
    ...(answer.failure?.code ? { code: answer.failure.code } : {}),
    ...(typeof answer.status === "number" ? { status: answer.status } : {}),
  };
}

interface ReadOptions {
  signal?: AbortSignal;
}

async function fetchApiKeyList(
  businessId: string | undefined,
  { signal }: ReadOptions = {},
): Promise<IntegrationAnswer<ApiKeyRow[]>> {
  const errorMessage = "Houve um erro ao carregar as chaves.";

  return settle(
    relayJson<{ data: ApiKeyRow[] }>(
      relayUrl("/integrations/api-keys", readQuery({ businessId })),
      { signal, errorMessage },
    ).then((answer) => answer.data),
    errorMessage,
  );
}

async function fetchWebhookEndpoints(
  businessId: string | undefined,
  { signal }: ReadOptions = {},
): Promise<IntegrationAnswer<WebhookEndpointRow[]>> {
  const errorMessage = "Houve um erro ao carregar os endpoints.";

  return settle(
    relayJson<{ data: WebhookEndpointRow[] }>(
      relayUrl("/integrations/webhook-endpoints", readQuery({ businessId })),
      { signal, errorMessage },
    ).then((answer) => answer.data),
    errorMessage,
  );
}

async function fetchWebhookDeliveries(
  page: number,
  pageSize: number,
  filters: {
    status?: MonitorStatusFilter;
    window?: MonitorWindow;
    endpointId?: string;
    businessId?: string;
  },
  { signal }: ReadOptions = {},
): Promise<IntegrationAnswer<WebhookDeliveryPage>> {
  const errorMessage = "Houve um erro ao carregar o monitor.";

  const read = relayNdjson<WebhookDeliveryRow>(
    relayUrl(
      "/integrations/webhook-deliveries",
      readQuery({
        page,
        pageSize,
        status: filters.status,
        window: filters.window,
        endpointId: filters.endpointId,
        businessId: filters.businessId,
      }),
    ),
    { signal, errorMessage },
  ).then(({ meta, data }): WebhookDeliveryPage => ({
    data,
    total: meta?.total ?? data.length,
    currentPage: meta?.page ?? page,
    pageSize: meta?.pageSize ?? pageSize,
    meta: meta?.searchMeta,
  }));

  return settle(read, errorMessage);
}

async function fetchApiUsage(
  days: number,
  filters: { apiKeyId?: string; businessId?: string },
  { signal }: ReadOptions = {},
): Promise<IntegrationAnswer<ApiUsageData>> {
  const errorMessage = "Houve um erro ao carregar o uso da API.";

  return settle(
    relayJson<{ data: ApiUsageData }>(
      relayUrl(
        "/integrations/api-usage",
        readQuery({
          days,
          apiKeyId: filters.apiKeyId,
          businessId: filters.businessId,
        }),
      ),
      { signal, errorMessage },
    ).then((answer) => answer.data),
    errorMessage,
  );
}

export {
  fetchApiKeyList,
  fetchWebhookEndpoints,
  fetchWebhookDeliveries,
  fetchApiUsage,
};
export type { IntegrationAnswer };
