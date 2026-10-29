import { redirect } from "next/navigation";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError, type AccessError } from "@/lib/access-error";

/**
 * One page of a fleet list, read by a server component: the vehicle, type
 * and checklist screens ask the same way and handle the same answers — a
 * 401 goes to the login, a 403 is told apart by its code (decision 4.1), any
 * other failure keeps the screen with an error the table shows.
 *
 * No directive: server-only by use (it calls `redirect`).
 */
interface FleetListPage<TRow, TMeta> {
  rows: TRow[];
  meta: TMeta;
  responseError: { error: boolean; errorMessage: string };
  accessError: AccessError | null;
}

async function fetchFleetList<
  TRow,
  TMeta extends { total: number; page: number; pageSize: number },
>({
  path,
  query,
  token,
  entityLabel,
}: {
  path: string;
  query: URLSearchParams;
  token: string;
  /** "os veículos", "os tipos de veículo"… for the error sentence. */
  entityLabel: string;
}): Promise<FleetListPage<TRow, TMeta>> {
  const page = Number(query.get("page")) || 1;
  const pageSize = Number(query.get("pageSize")) || 10;

  const empty = { total: 0, page, pageSize } as TMeta;

  let response: Response;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}${path}?${query.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
      },
    );
  } catch {
    return {
      rows: [],
      meta: empty,
      accessError: null,
      responseError: {
        error: true,
        errorMessage: `Ocorreu um erro inesperado ao carregar ${entityLabel}.`,
      },
    };
  }

  if (response.status === 401) redirect("/login");

  const accessError = await readAccessError(response);

  if (accessError) {
    return {
      rows: [],
      meta: empty,
      accessError,
      responseError: { error: false, errorMessage: "" },
    };
  }

  if (!response.ok) {
    return {
      rows: [],
      meta: empty,
      accessError: null,
      responseError: {
        error: true,
        errorMessage: `Não foi possível carregar ${entityLabel}. Tente revalidar.`,
      },
    };
  }

  const { meta, data } = await parseNDJSON(response);

  return {
    rows: (data ?? []) as TRow[],
    meta: (meta ?? { ...empty, total: (data ?? []).length }) as TMeta,
    accessError: null,
    responseError: { error: false, errorMessage: "" },
  };
}

export { fetchFleetList };
export type { FleetListPage };
