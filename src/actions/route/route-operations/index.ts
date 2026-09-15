"use server";

import { getCookies } from "@/actions/cookies";

import type { ActionResponse } from "@/actions/route/get-route";

/**
 * The imperative half of the route module: the acts that are not a form.
 *
 * Grouped in one file because they share everything that matters — the same
 * token, the same envelope, the same way of surfacing a refusal — and differ
 * only in a verb and a URL. Split across six folders, the next person fixing
 * how a 409 reaches the screen would have to find and change six copies.
 *
 * Every one of them returns the API's own message. The route module answers
 * 409 for "somebody got there first" on almost every write, and that message
 * already says what the dispatcher has to do about it ("Atualize a tela"),
 * which no generic fallback here could say better.
 */
async function call<T = undefined>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown> | undefined,
  fallback: string,
): Promise<ActionResponse<T>> {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(`${process.env.HTTP_REQUEST}${path}`, {
      credentials: "include",
      method,
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, message: result.message || fallback };
    }

    return {
      success: true,
      message: result.message ?? "",
      data: result.data as T,
    };
  } catch (error) {
    return { success: false, message: fallback };
  }
}

/** Hands the route to its driver, or pulls it back to planning. */
const releaseRoute = (
  businessId: string,
  routeId: string,
  released: boolean,
): Promise<ActionResponse> =>
  call(
    `/route/release-route/${routeId}/business/${businessId}`,
    "PATCH",
    { released },
    released
      ? "Não foi possível liberar a rota."
      : "Não foi possível devolver a rota ao planejamento.",
  );

const cancelRoute = (
  businessId: string,
  routeId: string,
  reason: string,
): Promise<ActionResponse> =>
  call(
    `/route/cancel-route/${routeId}/business/${businessId}`,
    "PATCH",
    { reason },
    "Não foi possível cancelar a rota.",
  );

const addRouteStops = (
  businessId: string,
  routeId: string,
  deliveryIds: string[],
): Promise<ActionResponse<{ added: number }>> =>
  call(
    `/route/add-stops/${routeId}/business/${businessId}`,
    "POST",
    { deliveryIds },
    "Não foi possível adicionar as paradas.",
  );

const removeRouteStop = (
  businessId: string,
  routeId: string,
  stopId: string,
): Promise<ActionResponse> =>
  call(
    `/route/remove-stop/${stopId}/route/${routeId}/business/${businessId}`,
    "DELETE",
    undefined,
    "Não foi possível remover a parada.",
  );

/**
 * Sends the COMPLETE order, not a move.
 *
 * A move instruction applied to a route a colleague has since changed
 * silently produces an order nobody asked for. The full list either describes
 * the route as it is, or describes one that no longer exists — and the API
 * refuses the second with 409 so the dispatcher refreshes and redoes it.
 */
const reorderRouteStops = (
  businessId: string,
  routeId: string,
  orderedStopIds: string[],
): Promise<ActionResponse> =>
  call(
    `/route/reorder-stops/${routeId}/business/${businessId}`,
    "PATCH",
    { orderedStopIds },
    "Não foi possível salvar a nova ordem.",
  );

export {
  addRouteStops,
  cancelRoute,
  releaseRoute,
  removeRouteStop,
  reorderRouteStops,
};
