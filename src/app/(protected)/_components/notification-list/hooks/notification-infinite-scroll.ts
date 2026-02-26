import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "react-query";

import { getCookies } from "@/actions/cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { formatNotificationDate } from "@/lib/format-values";
import {
  Notification,
  NotificationStreamMeta,
  FetchNotificationsProps,
} from "../dto";

import { useNotificationsContext } from "../../layout/protected-provider/notifications-provider";

const NOTIFICATIONS_PAGE_SIZE = 20;

interface FetchNotificationsResult {
  data: Notification[];
  meta: NotificationStreamMeta;
}

const fetchNotifications = async ({
  cursor,
  includeRead = true,
  signal,
}: FetchNotificationsProps): Promise<FetchNotificationsResult> => {
  const tokenAccess = await getCookies("tkey");
  const params = new URLSearchParams();

  params.append("limit", String(NOTIFICATIONS_PAGE_SIZE));
  params.append("includeRead", String(includeRead));

  if (cursor) {
    params.append("cursor", cursor);
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_HTTP_REQUEST}/notification/stream?${params.toString()}`,
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

    // Format notification dates
    const formattedData = data.map((notification: Notification) => ({
      ...notification,
      created_at: formatNotificationDateSafe(notification.created_at),
    }));

    return {
      data: formattedData,
      meta: {
        ...meta,
        // Extract searchMeta if present (backend sends it nested)
        ...(meta?.searchMeta || {}),
      } as NotificationStreamMeta,
    };
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error(error.message || "Erro ao carregar notificações");
  }
};

function formatNotificationDateSafe(date: string | Date): string {
  try {
    if (typeof date === "string") {
      if (date.includes("T") || date.includes("-")) {
        return formatNotificationDate(new Date(date));
      }

      return date; // Already formatted
    }

    return formatNotificationDate(date instanceof Date ? date : new Date(date));
  } catch {
    return formatNotificationDate(new Date());
  }
}

function useNotificationInfiniteScroll(includeRead: boolean = true) {
  const queryClient = useQueryClient();
  const observer = useRef<IntersectionObserver>();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [immediateError, setImmediateError] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get context for syncing notifications
  const { syncWithServerData } = useNotificationsContext();

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

  const queryKey = ["notifications", includeRead];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => {
      if (!isMountedRef.current) {
        return Promise.reject(new Error("Component unmounted"));
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      return fetchNotifications({
        cursor: pageParam,
        includeRead,
        signal: abortControllerRef.current.signal,
      });
    },
    getNextPageParam: (lastPage) => {
      // Check if there are more pages using hasMore from backend
      if (lastPage.meta?.hasMore && lastPage.meta?.nextCursor) {
        return lastPage.meta.nextCursor;
      }

      // Fallback: if we got a full page, there might be more
      if (lastPage.data.length >= NOTIFICATIONS_PAGE_SIZE) {
        const lastItem = lastPage.data[lastPage.data.length - 1];
        return lastItem?.id;
      }

      return undefined;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    // CRITICAL FIX: Disable keepPreviousData to prevent ghost data resurrection
    keepPreviousData: false,
    onError: (error: any) => {
      if (!isMountedRef.current) return;

      setErrorMessage(error.message);
      setImmediateError(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    },
    onSuccess: (data) => {
      if (!isMountedRef.current) return;

      setImmediateError(false);
      setErrorMessage(null);

      // Sync with context - merge server data with real-time notifications
      const allNotifications = data.pages.flatMap((page) => page.data);
      const allIds = allNotifications.map((n) => n.id);

      syncWithServerData(allNotifications, allIds);
    },
  });

  // CRITICAL: Function to remove notification from React Query cache
  const removeFromCache = useCallback(
    (notificationId: string) => {
      queryClient.setQueryData<typeof data>(queryKey, (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            data: page.data.filter((n) => n.id !== notificationId),
          })),
        };
      });
    },
    [queryClient, queryKey],
  );

  // CRITICAL: Function to update notification in React Query cache (mark as read)
  const updateInCache = useCallback(
    (notificationId: string, updates: Partial<Notification>) => {
      queryClient.setQueryData<typeof data>(queryKey, (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            data: page.data.map((n) =>
              n.id === notificationId ? { ...n, ...updates } : n,
            ),
          })),
        };
      });
    },
    [queryClient, queryKey],
  );

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

  const notifications = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  const meta = useMemo(() => {
    if (!data?.pages || data.pages.length === 0) return null;
    // Get the first page meta for total/unread counts
    return data.pages[0].meta;
  }, [data]);

  const handleRefetch = useCallback(() => {
    if (!isMountedRef.current) return;

    setImmediateError(false);
    setErrorMessage(null);

    refetch();
  }, [refetch]);

  return {
    notifications,
    meta,
    lastElementRef,
    isFetching,
    isLoading,
    isError,
    errorMessage,
    refetch: handleRefetch,
    hasError: isError || immediateError,
    hasNextPage: hasNextPage ?? false,
    // CRITICAL: Expose cache manipulation functions
    removeFromCache,
    updateInCache,
  };
}

export { useNotificationInfiniteScroll };
