import { redirect } from "next/navigation";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError, type AccessError } from "@/lib/access-error";

/**
 * One page of a maintenance listing, read on the server (the three lists of
 * this feature share it). A 401 goes to the login; a 403 is classified
 * (module, permission, inactive company — decision 4.1) instead of turning
 * into a generic error or "módulo não contratado".
 */
interface MaintenanceListPage<TRow, TSearchMeta> {
  rows: TRow[];
  meta: { total: number; page: number; pageSize: number };
  searchMeta?: TSearchMeta;
  responseError: { error: boolean; errorMessage: string };
  accessError: AccessError | null;
}

async function fetchMaintenanceList<TRow, TSearchMeta>({
  path,
  query,
  token,
  tag,
  what,
}: {
  path: string;
  query: URLSearchParams;
  token: string;
  /** The server cache tag the dialogs revalidate after a write. */
  tag: string;
  /** "as ordens de serviço", for the error sentence. */
  what: string;
}): Promise<MaintenanceListPage<TRow, TSearchMeta>> {
  const page = Number(query.get("page")) || 1;
  const pageSize = Number(query.get("pageSize")) || 10;

  const empty: MaintenanceListPage<TRow, TSearchMeta> = {
    rows: [],
    meta: { total: 0, page, pageSize },
    responseError: { error: false, errorMessage: "" },
    accessError: null,
  };

  let response: Response;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}${path}?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: { tags: [tag] },
      },
    );
  } catch {
    return {
      ...empty,
      responseError: {
        error: true,
        errorMessage: `Ocorreu um erro inesperado ao tentar recuperar ${what}.`,
      },
    };
  }

  if (response.status === 401) redirect("/login");

  const accessError = await readAccessError(response);

  if (accessError) return { ...empty, accessError };

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    return {
      ...empty,
      responseError: {
        error: true,
        errorMessage:
          typeof body?.message === "string"
            ? body.message
            : `Houve um erro ao tentar recuperar ${what}.`,
      },
    };
  }

  const { meta, data } = await parseNDJSON(response);

  return {
    ...empty,
    rows: data as TRow[],
    meta: {
      total: meta?.total ?? data.length,
      page: meta?.page ?? page,
      pageSize: meta?.pageSize ?? pageSize,
    },
    searchMeta: meta?.searchMeta as TSearchMeta | undefined,
  };
}

export { fetchMaintenanceList, type MaintenanceListPage };
