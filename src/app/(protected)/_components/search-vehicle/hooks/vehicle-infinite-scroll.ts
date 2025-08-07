import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "react-query";

import { getCookies } from "@/actions/cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";

interface FetchVehicleProps {
  pageParam: number;
  businessId: string;
  signal?: AbortSignal;
}

const fetchVehicle = async ({
  pageParam,
  businessId,
  signal,
}: FetchVehicleProps) => {
  const MAX_VEHICLE_PAGE = 10;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_HTTP_REQUEST}/vehicle/list-vehicle-business?businessId=${businessId}&&page=${pageParam}&pageSize=${MAX_VEHICLE_PAGE}`,
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
    throw new Error(error.message || "Erro ao carregar veículos");
  }
};

function useVehicleInfiniteScroll(businessId: string) {
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
    queryKey: ["vehicle", businessId],
    queryFn: ({ pageParam = 1 }) => {
      if (!isMountedRef.current) {
        return Promise.reject(new Error("Component unmounted"));
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      return fetchVehicle({
        pageParam,
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
    enabled: !!businessId,
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

  const vehicles = useMemo(() => {
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
    vehicles,
    lastElementRef,
    isFetching,
    isLoading,
    isError,
    errorMessage,
    refetch: handleRefetch,
    hasError: isError || immediateError,
  };
}

export { useVehicleInfiniteScroll };
