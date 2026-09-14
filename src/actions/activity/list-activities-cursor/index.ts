"use server";

import { getCookies } from "../../cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";

import type { ActivityRow } from "@/features/activity/lib/grouping";

interface ListActivitiesCursorParams {
  period: "7d" | "30d";
  cursor?: string;
  search?: string;
  businessId?: string;
  limit?: number;
}

interface ListActivitiesCursorResponse {
  success: boolean;
  message: string;
  data: ActivityRow[];
  nextCursor: string | null;
  hasMore: boolean;
}

const emptyResult = (message: string): ListActivitiesCursorResponse => ({
  success: false,
  message,
  data: [],
  nextCursor: null,
  hasMore: false,
});

/**
 * One page of the timeline feed.
 *
 * `period` travels on every call, not only the first: it is part of what the
 * cursor points into, so a page fetched under a different window would come
 * from a different result set than the rows already on screen.
 */
const listActivitiesCursor = async ({
  period,
  cursor,
  search,
  businessId,
  limit = 20,
}: ListActivitiesCursorParams): Promise<ListActivitiesCursorResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return emptyResult("Token de acesso não encontrado. Faça login novamente.");
  }

  try {
    const params = new URLSearchParams({
      period,
      limit: String(limit),
      ...(cursor && { cursor }),
      ...(search && { search }),
      ...(businessId && { businessId }),
    });

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/activity/list-cursor?${params}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${tokenAccess}`,
        },
        next: { tags: ["create-activity"] },
      },
    );

    if (!response.ok) {
      return emptyResult("Houve um erro ao tentar recuperar as atividades.");
    }

    const { meta, data } = await parseNDJSON(response);

    // The cursor fields ride in searchMeta, the same slot the deliveries
    // aggregates use — sendAsNDJSON puts everything extra there.
    const cursorMeta = meta?.searchMeta ?? {};

    return {
      success: true,
      message: "Atividades recuperadas com sucesso.",
      data: data as ActivityRow[],
      nextCursor: (cursorMeta.nextCursor as string | null) ?? null,
      hasMore: Boolean(cursorMeta.hasMore),
    };
  } catch (error) {
    return emptyResult(
      "Ocorreu um erro inesperado ao tentar recuperar as atividades.",
    );
  }
};

export { listActivitiesCursor };
export type { ListActivitiesCursorResponse };
