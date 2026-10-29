"use server";

import { logActionError } from "@/lib/log-action-error";
import { classifyAccessError } from "@/lib/access-error";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { getCookies } from "../../cookies";

import type { ActionResponse } from "../chat.types";
import { apiFetch } from "@/lib/api-fetch";

/**
 * What "+ Novo atendimento" can be about (design §6.1): the chosen driver's
 * deliveries and routes still in play, searched on the server through the
 * same listings as the boards (so the search reads the same fields). One
 * page of 20: a driver holds a day's work, and the search finds the rest.
 */

type TicketContextKind = "DELIVERY" | "ROUTE";

interface TicketContextOption {
  id: string;
  label: string;
  description: string | null;
}

/** Deliveries a tower still talks about; closed ones are done. */
const OPEN_DELIVERY_STATUSES = "PENDING,IN_TRANSIT,FAILED";

/** Routes not finished nor cancelled. */
const OPEN_ROUTE_STATUSES = "PLANNED,RELEASED,IN_PROGRESS";

const CONTEXT_PAGE_SIZE = "20";

function deliveryOption(row: Record<string, any>): TicketContextOption {
  const place = [row.city, row.uf].filter(Boolean).join("/");

  return {
    id: String(row.id),
    label: String(row.recipient_name ?? "Entrega"),
    description: place || null,
  };
}

function routeOption(row: Record<string, any>): TicketContextOption {
  return {
    id: String(row.id),
    label: row.name ? `Rota ${row.code} · ${row.name}` : `Rota ${row.code}`,
    description:
      typeof row.destination === "string" && row.destination
        ? row.destination
        : null,
  };
}

async function listTicketContexts(input: {
  businessId?: string;
  driverId: string;
  kind: TicketContextKind;
  search?: string;
}): Promise<ActionResponse<TicketContextOption[]>> {
  const isDelivery = input.kind === "DELIVERY";
  const errorMessage = isDelivery
    ? "Não foi possível carregar as entregas do motorista."
    : "Não foi possível carregar as rotas do motorista.";

  try {
    const tokenAccess = await getCookies("tkey");

    if (!tokenAccess) {
      return {
        success: false,
        message: "Token de acesso não encontrado. Faça login novamente.",
      };
    }

    const params = new URLSearchParams({
      page: "1",
      pageSize: CONTEXT_PAGE_SIZE,
      driverId: input.driverId,
      status: isDelivery ? OPEN_DELIVERY_STATUSES : OPEN_ROUTE_STATUSES,
    });

    if (input.businessId) params.set("businessId", input.businessId);
    if (input.search?.trim())
      params.set("search", input.search.trim().slice(0, 100));

    const path = isDelivery ? "/delivery/list-delivery" : "/route/list-routes";

    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}${path}?${params.toString()}`,
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
      const record = ((await response.json().catch(() => ({}))) ??
        {}) as Record<string, unknown>;

      return {
        success: false,
        message:
          typeof record.message === "string" ? record.message : errorMessage,
        accessError: classifyAccessError(response.status, record),
      };
    }

    // NDJSON: an envelope line, then one row per line.
    const { data } = await parseNDJSON(response);

    return {
      success: true,
      message: "",
      data: (data as Array<Record<string, any>>).map(
        isDelivery ? deliveryOption : routeOption,
      ),
    };
  } catch (error) {
    logActionError(`chat/tickets/contexts-${input.kind.toLowerCase()}`, error);

    return { success: false, message: errorMessage };
  }
}

export { listTicketContexts };
export type { TicketContextKind, TicketContextOption };
