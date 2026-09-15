"use server";

import { getCookies } from "../cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";

type ApiScope =
  | "deliveries:read"
  | "deliveries:write"
  | "routes:read"
  | "events:read";

interface ApiKeyRow {
  id: string;
  name: string;

  /** What the list can show. The secret half exists once, at creation. */
  prefix: string;

  scopes: string[];
  rate_limit_per_minute: number;

  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface WebhookEndpointRow {
  id: string;
  name: string;
  url: string;

  topics: string[];

  /** The customer's switch. */
  is_active: boolean;

  /** Ours, after too many failures in a row. A different fact entirely. */
  disabled_at: string | null;

  consecutive_failures: number;
  created_at: string;
}

interface WebhookDeliveryRow {
  id: string;
  topic: string;
  status: "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED";

  attempts: number;

  response_status: number | null;
  response_body: string | null;

  /** Named as the API names it, so there is one word per thing. */
  lastError: string | null;

  latency_ms: number | null;

  availableAt: string | null;
  deliveredAt: string | null;
  created_at: string;

  endpoint: { id: string; name: string; url: string } | null;
}

interface WebhookDeliveryMeta {
  delivered: number;
  failed: number;
  pending: number;

  /** Over the last 24h, and only over what was actually delivered. */
  p95LatencyMs: number | null;
}

interface WebhookDeliveryPage {
  data: WebhookDeliveryRow[];
  total: number;
  currentPage: number;
  pageSize: number;
  meta?: WebhookDeliveryMeta;
}

interface ApiUsageRouteRow {
  method: string;
  route: string;

  ok: number;
  clientError: number;
  serverError: number;
}

interface ApiUsageData {
  totals: { ok: number; clientError: number; serverError: number };

  byRoute: ApiUsageRouteRow[];

  /** Every day in the window, zeros included. */
  byDay: Array<{ day: string; total: number }>;

  keys: Array<{ id: string; name: string; prefix: string }>;
}

interface CatalogueTopic {
  topic: string;
  family: "route" | "document";
  description: string;
}

interface IntegrationCatalogue {
  version: string;
  topics: CatalogueTopic[];
  scopes: Array<{ scope: string; description: string }>;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

const NO_TOKEN = {
  success: false as const,
  message: "Token de acesso não encontrado. Faça login novamente.",
};

const withBusiness = (businessId?: string): string =>
  businessId ? `?businessId=${businessId}` : "";

/**
 * The catalogue is served WITHOUT a key on purpose — it is the list somebody
 * reads before they integrate. Fetched here rather than copied into the form,
 * so a topic added to the API shows up in the picker the same day.
 */
const getIntegrationCatalogue = async (): Promise<
  ActionResponse<IntegrationCatalogue>
> => {
  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/integration/v1/catalogue`,
      { method: "GET", next: { revalidate: 300 } },
    );

    if (!response.ok) {
      return {
        success: false,
        message: "Não foi possível carregar o catálogo de eventos.",
      };
    }

    return {
      success: true,
      message: "Catálogo obtido com sucesso.",
      data: await response.json(),
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar o catálogo.",
    };
  }
};

const listApiKeys = async (
  businessId?: string,
): Promise<ActionResponse<ApiKeyRow[]>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return NO_TOKEN;

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/integrations/api-keys${withBusiness(
        businessId,
      )}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao carregar as chaves.",
      };
    }

    return { success: true, message: result.message, data: result.data };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar as chaves.",
    };
  }
};

interface CreateApiKeyPayload {
  name: string;
  scopes: ApiScope[];
  rate_limit_per_minute?: number;
}

/**
 * The token comes back in THIS response and nowhere else, ever again.
 *
 * Which is why the caller has to hand it to the person immediately: a screen
 * that could re-show a key would put that key in every screenshot and every
 * support ticket.
 */
const createApiKey = async (
  businessId: string,
  payload: CreateApiKeyPayload,
): Promise<ActionResponse<{ id: string; prefix: string; token: string }>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return NO_TOKEN;

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/integrations/api-key/${businessId}`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao emitir a chave.",
      };
    }

    return { success: true, message: result.message, data: result.data };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao emitir a chave.",
    };
  }
};

const revokeApiKey = async (
  businessId: string,
  id: string,
): Promise<ActionResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return NO_TOKEN;

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/integrations/api-key/${id}/business/${businessId}`,
      {
        credentials: "include",
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
      },
    );

    const result = await response.json();

    return {
      success: response.ok,
      message:
        result.message ||
        (response.ok ? "Chave revogada." : "Houve um erro ao revogar a chave."),
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao revogar a chave.",
    };
  }
};

const listWebhookEndpoints = async (
  businessId?: string,
): Promise<ActionResponse<WebhookEndpointRow[]>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return NO_TOKEN;

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/integrations/webhook-endpoints${withBusiness(
        businessId,
      )}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao carregar os endpoints.",
      };
    }

    return { success: true, message: result.message, data: result.data };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar os endpoints.",
    };
  }
};

interface SaveWebhookEndpointPayload {
  name: string;
  url: string;
  topics: string[];
  headers?: Record<string, string>;
  is_active: boolean;
}

/**
 * Create and edit are the same form, and the secret only exists on create.
 *
 * Editing does not regenerate it — rotating a secret behind somebody's back
 * would break their verification with no warning — so `data.secret` is null on
 * every save but the first.
 */
const saveWebhookEndpoint = async (
  businessId: string,
  payload: SaveWebhookEndpointPayload,
  id?: string,
): Promise<ActionResponse<{ id: string; secret: string | null }>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return NO_TOKEN;

  const url = id
    ? `${process.env.HTTP_REQUEST}/integrations/webhook-endpoint/${id}/business/${businessId}`
    : `${process.env.HTTP_REQUEST}/integrations/webhook-endpoint/${businessId}`;

  try {
    const response = await fetch(url, {
      credentials: "include",
      method: id ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao salvar o endpoint.",
      };
    }

    return { success: true, message: result.message, data: result.data };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao salvar o endpoint.",
    };
  }
};

const deleteWebhookEndpoint = async (
  businessId: string,
  id: string,
): Promise<ActionResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return NO_TOKEN;

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/integrations/webhook-endpoint/${id}/business/${businessId}`,
      {
        credentials: "include",
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
      },
    );

    const result = await response.json();

    return {
      success: response.ok,
      message:
        result.message ||
        (response.ok
          ? "Endpoint removido."
          : "Houve um erro ao remover o endpoint."),
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao remover o endpoint.",
    };
  }
};

const listWebhookDeliveries = async (
  page: number,
  pageSize: number,
  filters: {
    status?: WebhookDeliveryRow["status"];
    endpointId?: string;
    businessId?: string;
  } = {},
): Promise<ActionResponse<WebhookDeliveryPage>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return NO_TOKEN;

  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (filters.status) params.set("status", filters.status);
    if (filters.endpointId) params.set("endpointId", filters.endpointId);
    if (filters.businessId) params.set("businessId", filters.businessId);

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/integrations/webhook-deliveries?${params}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const result = await response.json();

      return {
        success: false,
        message: result.message || "Houve um erro ao carregar o monitor.",
      };
    }

    // NDJSON: the envelope first, then one line per delivery.
    const { meta, data } = await parseNDJSON(response);

    return {
      success: true,
      message: "Monitor obtido com sucesso.",
      data: {
        data,
        total: meta?.total ?? data.length,
        currentPage: meta?.page ?? page,
        pageSize: meta?.pageSize ?? pageSize,
        meta: meta?.searchMeta,
      } as WebhookDeliveryPage,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar o monitor.",
    };
  }
};

/**
 * What the customer's system asked of US, which is the question support gets
 * before "did you send it".
 *
 * Read off a daily aggregate, so the answer costs the same whether they made
 * forty calls or four hundred thousand.
 */
const listApiUsage = async (
  days: number,
  filters: { apiKeyId?: string; businessId?: string } = {},
): Promise<ActionResponse<ApiUsageData>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return NO_TOKEN;

  try {
    const params = new URLSearchParams({ days: String(days) });

    if (filters.apiKeyId) params.set("apiKeyId", filters.apiKeyId);
    if (filters.businessId) params.set("businessId", filters.businessId);

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/integrations/api-usage?${params}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao carregar o uso da API.",
      };
    }

    return { success: true, message: result.message, data: result.data };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar o uso da API.",
    };
  }
};

/**
 * A resend writes a NEW row rather than reopening the old one.
 *
 * What we sent and what their server answered the first time is the first
 * thing anybody asks for when they call about a duplicate, and reusing the row
 * would erase it.
 */
const resendWebhookDelivery = async (
  businessId: string,
  id: string,
): Promise<ActionResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return NO_TOKEN;

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/integrations/webhook-delivery/${id}/business/${businessId}/resend`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
      },
    );

    const result = await response.json();

    return {
      success: response.ok,
      message:
        result.message ||
        (response.ok
          ? "Evento reenfileirado."
          : "Houve um erro ao reenviar o evento."),
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao reenviar o evento.",
    };
  }
};

export {
  createApiKey,
  deleteWebhookEndpoint,
  getIntegrationCatalogue,
  listApiKeys,
  listApiUsage,
  listWebhookDeliveries,
  listWebhookEndpoints,
  resendWebhookDelivery,
  revokeApiKey,
  saveWebhookEndpoint,
};

export type {
  ApiKeyRow,
  ApiScope,
  ApiUsageData,
  ApiUsageRouteRow,
  CatalogueTopic,
  IntegrationCatalogue,
  SaveWebhookEndpointPayload,
  WebhookDeliveryMeta,
  WebhookDeliveryPage,
  WebhookDeliveryRow,
  WebhookEndpointRow,
};
