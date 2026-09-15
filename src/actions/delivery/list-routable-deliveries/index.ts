"use server";

import { getCookies } from "@/actions/cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";

import type { ActionResponse } from "@/actions/route/get-route";

interface RoutableDelivery {
  id: string;
  code: string | null;
  recipient_name: string;
  city: string;
  uf: string;
  scheduled_date: string | null;

  /** Present when the delivery was already designated to somebody. */
  driver: { id: string; name: string } | null;
}

/**
 * The deliveries a dispatcher can put on a route: the PENDING ones.
 *
 * It does NOT exclude deliveries that already sit on another planned route.
 * The API has no filter for that, and adding one would be a wider change than
 * this screen justifies — so the list can offer an address that is already
 * promised elsewhere, and the API refuses it with 409 and a message that says
 * exactly that. What this does do is show the driver each delivery is already
 * designated to, which is the signal a dispatcher actually reads before
 * picking.
 *
 * Paged large and searched server-side rather than infinite-scrolled: the
 * dispatcher is looking for specific addresses to add, not browsing.
 */
const listRoutableDeliveries = async (
  businessId: string,
  search: string,
): Promise<ActionResponse<RoutableDelivery[]>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const query = new URLSearchParams({
    page: "1",
    pageSize: "50",
    status: "PENDING",
    businessId,
    ...(search && { search }),
  });

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/delivery/list-delivery?${query.toString()}`,
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
      const result = await response.json().catch(() => ({}));

      return {
        success: false,
        message:
          result.message || "Houve um erro ao carregar as entregas pendentes.",
      };
    }

    // NDJSON, like every offset listing in this API: an envelope line, then
    // one delivery per line. Calling response.json() here would throw.
    const { data } = await parseNDJSON(response);

    return {
      success: true,
      message: "",
      data: data as RoutableDelivery[],
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar as entregas.",
    };
  }
};

export { listRoutableDeliveries };
export type { RoutableDelivery };
