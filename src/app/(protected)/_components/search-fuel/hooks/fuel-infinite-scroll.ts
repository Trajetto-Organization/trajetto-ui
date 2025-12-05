import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "react-query";

import { getCookies } from "@/actions/cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { FetchFuelProps } from "../dto";

const fetchFuel = async ({
  pageParam,
  vehicleId,
  businessId,
  signal,
}: FetchFuelProps) => {
  const MAX_FUEL_PAGE = 10;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_HTTP_REQUEST}/fuel/list-fuel-by-vehicle/${vehicleId}?page=${pageParam}&pageSize=${MAX_FUEL_PAGE}`,
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

    const { data } = await parseNDJSON(response);
    return data;
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw error;
    }
    throw new Error(error.message || "Erro ao carregar abastecimentos");
  }
};

function useFuelInfiniteScroll(vehicleId: string, businessId: string) {
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
    queryKey: ["fuel", vehicleId, businessId],
    queryFn: ({ pageParam = 1 }) => {
      if (!isMountedRef.current) {
        return Promise.reject(new Error("Component unmounted"));
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      return fetchFuel({
        pageParam,
        vehicleId,
        businessId,
        signal: abortControllerRef.current.signal,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length ? allPages.length + 1 : undefined;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    enabled: !!vehicleId && !!businessId,
    keepPreviousData: true,
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

  const fuels = useMemo(() => {
    return data?.pages.reduce((acc, page) => {
      return [...acc, ...page];
    }, []);
  }, [data]);

  const handleRefetch = useCallback(() => {
    if (!isMountedRef.current) return;

    setImmediateError(false);
    refetch();
  }, [refetch]);

  return {
    fuels,
    lastElementRef,
    isFetching,
    isLoading,
    isError,
    errorMessage,
    refetch: handleRefetch,
    hasError: isError || immediateError,
  };
}

export { useFuelInfiniteScroll };
