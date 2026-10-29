"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery } from "react-query";

import type {
  ChatAudienceCount,
  ChatRecipient,
} from "@/actions/chat/chat.types";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { normalizeSearch, SEARCH_DEBOUNCE_MS } from "@/hooks/use-cursor-search";
import { CATALOG_STALE_TIME_MS } from "@/lib/query-client-props";

import { fetchChatRecipients } from "./chat-reads";

/** Rows per page: a picker shows about this many before scrolling. */
const RECIPIENTS_PAGE_SIZE = 20;

type RecipientsAppFilter = "WITH_APP" | "WITHOUT_APP";

interface UseChatRecipientsOptions {
  /** The company whose drivers are listed — also the cache scope. */
  businessId: string | null | undefined;

  /** What the person typed; debounced here and searched on the server. */
  search?: string;

  /** One side of the app line; both when omitted. */
  app?: RecipientsAppFilter;

  enabled?: boolean;
}

/**
 * The chat's recipients: the company's active drivers, by name or CNH.
 *
 * Read from `/chat/recipients` (delivery_manage:read) instead of the driver
 * search, which a tower user without `driver_manage` could not read — both
 * pickers of the chat opened empty for exactly the people who send.
 *
 * The key starts with "driver" and carries the company, so `catalogChanged`
 * for drivers refreshes these lists like every other driver picker.
 */
function useChatRecipients({
  businessId,
  search,
  app,
  enabled = true,
}: UseChatRecipientsOptions) {
  const observer = useRef<IntersectionObserver>();

  const typed = normalizeSearch(search);
  const term = useDebouncedValue(typed, SEARCH_DEBOUNCE_MS);

  const query = useInfiniteQuery(
    [
      "driver",
      businessId ?? "none",
      "chat-recipients",
      { app: app ?? "ALL", search: term },
    ],
    // A relay GET (lib/chat-reads): a term typed fast cancels the read it
    // replaces instead of queueing behind it as a Server Action did.
    ({ pageParam, signal }) =>
      fetchChatRecipients(
        {
          businessId: businessId ?? undefined,
          search: term || undefined,
          app,
          cursor: pageParam as string | undefined,
          limit: RECIPIENTS_PAGE_SIZE,
        },
        { signal },
      ),
    {
      getNextPageParam: (last) =>
        last.hasMore ? (last.nextCursor ?? undefined) : undefined,
      enabled: enabled && Boolean(businessId),
      keepPreviousData: true,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: CATALOG_STALE_TIME_MS,
    },
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isLoading,
    isPreviousData,
  } = query;

  const recipients = useMemo<ChatRecipient[]>(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  /** From the first page: the company-wide count, whatever is typed. */
  const audience: ChatAudienceCount | null = data?.pages[0]?.audience ?? null;

  const lastElementRef = useCallback(
    (node: Element | null) => {
      observer.current?.disconnect();

      if (!node || !hasNextPage) return;

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && !isFetching && !isError) {
          void fetchNextPage();
        }
      });

      observer.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isError, isFetching],
  );

  useEffect(() => () => observer.current?.disconnect(), []);

  return {
    recipients,
    audience,
    lastElementRef,
    isLoading,
    isFetching,
    isError,
    errorMessage: isError ? (query.error as Error).message : null,

    /** Whether the rows are the server's answer for what is typed now. */
    isSearchSettled: !isPreviousData && term === typed,
  };
}

export { useChatRecipients, RECIPIENTS_PAGE_SIZE };
export type { RecipientsAppFilter };
