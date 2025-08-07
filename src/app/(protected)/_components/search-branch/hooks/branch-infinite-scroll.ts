import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "react-query";

import { getCookies } from "@/actions/cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";

interface FetchBranchProps {
  pageParam: number;
  businessId: string;
  signal?: AbortSignal;
}

const fetchBranch = async ({
  pageParam,
  businessId,
  signal,
}: FetchBranchProps) => {
  const MAX_BRANCH_PAGE = 10;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_HTTP_REQUEST}/branch/list-branch-business?businessId=${businessId}&&page=${pageParam}&pageSize=${MAX_BRANCH_PAGE}`,
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
    throw new Error(error.message || "Erro ao carregar filiais");
  }
};

function useBranchInfiniteScroll(businessId: string) {
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
    queryKey: ["branch", businessId],
    queryFn: ({ pageParam = 1 }) => {
      if (!isMountedRef.current) {
        return Promise.reject(new Error("Component unmounted"));
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      return fetchBranch({
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

  const branches = useMemo(() => {
    return data?.pages.reduce((acc, page) => {
      return [...acc, ...page];
    }, []);
  }, [data]);

  const handleRefetch = useCallback(() => {
    if (!isMountedRef.current) return;

    setImmediateError(false);
    setErrorMessage(null);

    refetch();
  }, [refetch]);

  return {
    branches,
    lastElementRef,
    isFetching,
    isLoading,
    isError,
    errorMessage,
    refetch: handleRefetch,
    hasError: isError || immediateError,
  };
}

export { useBranchInfiniteScroll };
