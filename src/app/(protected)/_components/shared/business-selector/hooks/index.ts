import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient, type QueryClient } from "react-query";

import { relayUrl } from "@/lib/api-relay-paths";

import type { BusinessSelectorProps } from "../business-selector.types";
import { useBusinessInfiniteScroll } from "../../searches/search-business/hooks/business-infinite-scroll";

/**
 * What survives a company switch: where the person is and how they like to
 * see it. Everything else in the URL describes the previous company — its
 * page, search, filters, the driver conversation open on Entregas — and an
 * allowlist keeps a parameter added next month from leaking across.
 */
const KEPT_ON_BUSINESS_SWITCH = ["tab", "view", "period", "pageSize"] as const;

function paramsForBusinessSwitch(
  current: URLSearchParams,
  businessId: string,
): URLSearchParams {
  const next = new URLSearchParams({ businessId });

  for (const name of KEPT_ON_BUSINESS_SWITCH) {
    const value = current.get(name);

    if (value) next.set(name, value);
  }

  return next;
}

/** What the trigger shows for the company in use. */
interface SelectedBusiness {
  id: string;
  corporate_reason: string;
}

/**
 * The trigger's label, cached per company and apart from the list.
 *
 * Not under `["business"]`: that prefix is the list's, and whatever reshapes
 * the list's pages by prefix must not meet a single row there.
 */
function selectedBusinessKey(businessId: string) {
  return ["business-selected", businessId] as const;
}

function toSelectedBusiness(row: {
  id: string;
  corporate_reason: string;
}): SelectedBusiness {
  return { id: row.id, corporate_reason: row.corporate_reason };
}

function rememberSelectedBusiness(
  queryClient: QueryClient,
  row: { id: string; corporate_reason: string },
): void {
  queryClient.setQueryData(
    selectedBusinessKey(row.id),
    toSelectedBusiness(row),
  );
}

type HttpError = Error & { status?: number };

/**
 * One company's name, read by id.
 *
 * `get-ai-usage` is the only MASTER read of a single company the API has,
 * and it answers `id` and `corporate_reason` with four primary-key lookups.
 * Used only when neither the list nor an earlier pick has the company: a
 * page opened by link or F5 on one of ~3,600 tenants, far from page 1.
 */
async function fetchSelectedBusiness(
  businessId: string,
  signal?: AbortSignal,
): Promise<SelectedBusiness | null> {
  const response = await fetch(
    relayUrl(`/business/get-ai-usage/${encodeURIComponent(businessId)}`),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
    },
  );

  if (!response.ok) {
    const error: HttpError = new Error("Empresa não encontrada");

    // Read by the client's retry policy: a 4xx answers the same every time.
    error.status = response.status;
    throw error;
  }

  const body = await response.json().catch(() => null);
  const row = body?.data;

  if (row?.id !== businessId || typeof row.corporate_reason !== "string") {
    return null;
  }

  return toSelectedBusiness(row);
}

// The fields the API compares a term against (search-business).
const SEARCHED_FIELDS = [
  "corporate_reason",
  "fantasy_name",
  "cnpj",
  "email",
  "responsible_name",
] as const;

function matchesTerm(company: Record<string, unknown>, term: string): boolean {
  return SEARCHED_FIELDS.some((field) => {
    const value = company[field];

    return typeof value === "string" && value.toLowerCase().includes(term);
  });
}

function useBusinessSelector({ currentBusinessId }: BusinessSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  const {
    business,
    lastElementRef,
    isLoading,
    isFetching,
    hasError,
    errorMessage,
    refetch,
    isSearchSettled,
  } = useBusinessInfiniteScroll(searchValue);

  const filteredBusiness = useMemo(() => {
    if (!business) return [];

    const term = searchValue.trim().toLowerCase();

    // The API's answer is shown as it came. Only while the term is still on
    // its way are the rows on screen narrowed locally, on the same fields the
    // API compares, so a loaded company typed by CNPJ does not vanish first.
    if (!term || isSearchSettled) return business;

    return business.filter((company) => matchesTerm(company, term));
  }, [business, searchValue, isSearchSettled]);

  const listedSelection = useMemo<SelectedBusiness | null>(() => {
    if (!currentBusinessId || !business) return null;

    const row = business.find((company) => company.id === currentBusinessId);

    return row ? toSelectedBusiness(row) : null;
  }, [currentBusinessId, business]);

  // The list is the server's answer to the typed term, and past page 1 it
  // does not hold the company in use at all. The label is therefore cached
  // by id, in the QueryClient so it also outlives a remount (the Kanban
  // renders this selector in three branches): seeded whenever the list shows
  // the company, and on a pick below.
  useEffect(() => {
    if (listedSelection) rememberSelectedBusiness(queryClient, listedSelection);
  }, [listedSelection, queryClient]);

  // Nothing cached (a link, F5): asked by id once the first page has come
  // back without it.
  const { data: rememberedSelection } = useQuery<
    SelectedBusiness | null,
    HttpError
  >(
    selectedBusinessKey(currentBusinessId ?? ""),
    ({ signal }) => fetchSelectedBusiness(currentBusinessId as string, signal),
    {
      enabled: Boolean(currentBusinessId) && !listedSelection && !isLoading,
      // The global default would show the previous company's name under the
      // new id while it loads.
      keepPreviousData: false,
      refetchOnWindowFocus: false,
    },
  );

  const selectedBusiness =
    listedSelection ??
    (rememberedSelection?.id === currentBusinessId
      ? rememberedSelection
      : null);

  // Closing without choosing (Esc, click outside) abandons the search: the
  // next open starts from the full list rather than the old term.
  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);

    if (!next) setSearchValue("");
  }, []);

  const handleBusinessChange = (businessId: string) => {
    // Before the term is cleared: the row found by the search is about to
    // leave the list, and the navigation lands after it has.
    const picked = business?.find((company) => company.id === businessId);

    if (picked) rememberSelectedBusiness(queryClient, picked);

    handleOpenChange(false);

    if (businessId === currentBusinessId) {
      return;
    }

    const params = paramsForBusinessSwitch(
      new URLSearchParams(searchParams.toString()),
      businessId,
    );

    router.push(`?${params.toString()}`);
  };

  const handleRetry = () => {
    refetch();
  };

  return {
    open,
    setOpen: handleOpenChange,
    searchValue,
    setSearchValue,
    lastElementRef,
    isLoading,
    isFetching,
    hasError,
    errorMessage,
    filteredBusiness,
    selectedBusiness,
    handleBusinessChange,
    handleRetry,
    business,
    /**
     * The rows on screen are not yet the server's answer for what is typed
     * (debounce or request in flight). An empty list then means "not known
     * yet", not "no company matches".
     */
    isSearchPending: !isSearchSettled,
  };
}

export {
  useBusinessSelector,
  paramsForBusinessSwitch,
  selectedBusinessKey,
  KEPT_ON_BUSINESS_SWITCH,
};
export type { SelectedBusiness };
