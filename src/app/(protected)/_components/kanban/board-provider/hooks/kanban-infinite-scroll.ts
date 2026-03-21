import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "react-query";

import { getCookies } from "@/actions/cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";

import type { KanbanColumn } from "../../shared/common.types";

interface FetchKanbanProps {
  pageParam: number;
  businessId: string;
  search?: string;
  signal?: AbortSignal;
}

const fetchKanban = async ({
  pageParam,
  businessId,
  search,
  signal,
}: FetchKanbanProps) => {
  const PAGE_SIZE = 10;
  const tokenAccess = await getCookies("tkey");

  try {
    const params = new URLSearchParams({
      page: String(pageParam),
      pageSize: String(PAGE_SIZE),
      ...(search ? { search: encodeURIComponent(search) } : {}),
    });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_HTTP_REQUEST}/kanban/list/${businessId}?${params.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${tokenAccess}`,
        },
        signal,
      },
    );

    if (!response.ok) {
      const errorClone = response.clone();

      const errorData = await errorClone.json();
      throw new Error(
        errorData.message ||
          `Erro HTTP: ${response.status} - ${response.statusText}`,
      );
    }

    const { data, meta } = await parseNDJSON(response);
    return { data, meta };
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error(error.message || "Erro ao carregar kanban");
  }
};

function useKanbanInfiniteScroll(
  businessId: string | undefined,
  search?: string,
) {
  const observer = useRef<IntersectionObserver>();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [immediateError, setImmediateError] = useState<boolean>(false);

  const [totalColumns, setTotalColumns] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
    };
  }, []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["kanban", businessId, search],
    queryFn: ({ pageParam = 1 }) => {
      if (!isMountedRef.current || !businessId) {
        return Promise.reject(
          new Error("Component unmounted or no businessId"),
        );
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      return fetchKanban({
        pageParam,
        businessId,
        search,
        signal: abortControllerRef.current.signal,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentTotal = allPages.reduce(
        (acc, page) => acc + page.data.length,
        0,
      );
      return currentTotal < lastPage.meta.total
        ? allPages.length + 1
        : undefined;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Change: refetch when component is mounted again
    retry: 1,
    enabled: isMountedRef.current && !!businessId,
    keepPreviousData: true, // Additional: Keep previous data during refetch
    onSuccess: (data) => {
      if (!isMountedRef.current) return;

      const lastPage = data.pages[data.pages.length - 1];
      if (lastPage?.meta?.total !== undefined) {
        const currentTotal = lastPage.meta.total;

        if (search) {
          setFilteredTotal(currentTotal);
          setTotalColumns(currentTotal);
        } else {
          setTotalColumns(currentTotal);
          setFilteredTotal(currentTotal);
        }
      }
    },
    onError: (error: any) => {
      if (!isMountedRef.current) return;

      setErrorMessage(error.message);
      setImmediateError(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    },
  });

  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading || !isMountedRef.current) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetching &&
          !immediateError &&
          isMountedRef.current
        ) {
          fetchNextPage();
        }
      });

      if (node) observer.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetching, isLoading, immediateError],
  );

  const columns = useMemo(() => {
    return data?.pages.reduce((acc, page) => {
      return [...acc, ...page.data];
    }, [] as KanbanColumn[]);
  }, [data]);

  const handleRefetch = useCallback(() => {
    if (!isMountedRef.current) return;

    setImmediateError(false);
    refetch();
  }, [refetch]);

  const hasSearchResults = columns && columns.length > 0;
  const isSearching = !!search;

  const displayTotal = hasSearchResults
    ? filteredTotal
    : isSearching
      ? 0
      : totalColumns;

  return {
    columns,
    lastElementRef,
    isFetching,
    isLoading,
    isError,
    errorMessage,
    refetch: handleRefetch,
    hasError: isError || immediateError,
    hasNextPage,
    totalColumns: displayTotal,
    hasSearchResults,
    isSearching,
  };
}

export { useKanbanInfiniteScroll };
