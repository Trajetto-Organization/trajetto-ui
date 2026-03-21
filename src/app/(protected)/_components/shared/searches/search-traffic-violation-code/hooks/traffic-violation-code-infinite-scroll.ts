import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "react-query";

import { getCookies } from "@/actions/cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";

import type {
  FetchTrafficViolationCodeProps,
  FetchTrafficViolationCodeResult,
} from "../search-traffic-violation-code.types";

const LIMIT = 10;

const fetchTrafficViolationCode = async ({
  cursor,
  signal,
}: FetchTrafficViolationCodeProps): Promise<FetchTrafficViolationCodeResult> => {
  const tokenAccess = await getCookies("tkey");

  try {
    let url = `${process.env.NEXT_PUBLIC_HTTP_REQUEST}/traffic-violation/search-traffic-violation-codes?limit=${LIMIT}`;
    if (cursor) url += `&cursor=${cursor}`;

    const response = await fetch(url, {
      credentials: "include",
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
        Authorization: `Bearer ${tokenAccess}`,
      },
      signal,
    });

    if (!response.ok) {
      const errorClone = response.clone();
      const errorData = await errorClone.json();

      throw new Error(
        errorData.message ||
          `Erro HTTP: ${response.status} - ${response.statusText}`,
      );
    }

    const { meta, data } = await parseNDJSON(response);

    return {
      data: data || [],
      nextCursor: meta?.searchMeta?.nextCursor || null,
      hasMore: meta?.searchMeta?.hasMore || false,
    };
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      error.message || "Erro ao carregar os códigos de violação de tráfego",
    );
  }
};

function useTrafficViolationCodeInfiniteScroll() {
  const observer = useRef<IntersectionObserver>();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [immediateError, setImmediateError] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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
    queryKey: ["traffic_violation_code"],
    queryFn: ({ pageParam }) => {
      if (!isMountedRef.current) {
        return Promise.reject(new Error("Component unmounted"));
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      return fetchTrafficViolationCode({
        cursor: pageParam,
        signal: abortControllerRef.current.signal,
      });
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    enabled: isMountedRef.current,
    keepPreviousData: true,
    onError: (error: any) => {
      if (!isMountedRef.current) return;

      setErrorMessage(error.message);
      setImmediateError(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    },
    onSuccess: () => {
      setImmediateError(false);
      setErrorMessage(null);
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

  const trafficViolationCode = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const handleRefetch = useCallback(() => {
    if (!isMountedRef.current) return;

    setImmediateError(false);
    setErrorMessage(null);

    refetch();
  }, [refetch]);

  return {
    trafficViolationCode,
    lastElementRef,
    isFetching,
    isLoading,
    isError,
    errorMessage,
    refetch: handleRefetch,
    hasError: isError || immediateError,
  };
}

export { useTrafficViolationCodeInfiniteScroll };
