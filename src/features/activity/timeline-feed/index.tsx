"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { listActivitiesCursor } from "@/actions/activity/list-activities-cursor";

import { ActivityTimeline } from "../timeline";
import type { ActivityRow } from "../lib/grouping";

interface ActivityTimelineFeedProps {
  /** First page, rendered on the server so the panel opens already filled. */
  initialActivities: ActivityRow[];
  initialCursor: string | null;
  initialHasMore: boolean;
  period: "7d" | "30d";
  search?: string;
  businessId?: string;
  showBusiness: boolean;
  responseError: { error: boolean; errorMessage: string };
}

/**
 * The timeline as a feed: a first page from the server, then "carregar mais".
 *
 * The table next door keeps its page numbers — it has a total and column
 * filters, and offsets are the right shape for that. A feed is not: the audit
 * log is written to continuously, so an offset-paged second page hands back
 * rows the first page already showed, because everything shifted down in the
 * meantime. The cursor asks for what comes *after a row* instead.
 */
const ActivityTimelineFeed = ({
  initialActivities,
  initialCursor,
  initialHasMore,
  period,
  search,
  businessId,
  showBusiness,
  responseError,
}: ActivityTimelineFeedProps): JSX.Element => {
  const [activities, setActivities] =
    useState<ActivityRow[]>(initialActivities);

  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Changing the window is a different result set, so the accumulated pages
  // are dropped rather than appended to — the server re-renders the first
  // page and the cursor starts over from it.
  useEffect(() => {
    setActivities(initialActivities);
    setCursor(initialCursor);

    setHasMore(initialHasMore);
  }, [initialActivities, initialCursor, initialHasMore]);

  const handleLoadMore = async () => {
    if (!cursor || isLoading) return;

    setIsLoading(true);

    try {
      const response = await listActivitiesCursor({
        period,
        cursor,
        search,
        businessId,
      });

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      // The cursor guarantees no overlap, but a double click could fire two
      // identical requests before the first lands.
      setActivities((current) => {
        const seen = new Set(current.map((activity) => activity.id));

        return [
          ...current,
          ...response.data.filter((activity) => !seen.has(activity.id)),
        ];
      });

      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ActivityTimeline
        activities={activities}
        showBusiness={showBusiness}
        responseError={responseError}
      />

      {hasMore && !responseError.error && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={isLoading}
            onClick={() => void handleLoadMore()}
          >
            {isLoading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Carregar mais
              </>
            )}
          </Button>
        </div>
      )}

      {!hasMore && activities.length > 0 && !responseError.error && (
        <p className="text-center text-xs text-muted-foreground">
          Você chegou ao fim do período selecionado.
        </p>
      )}
    </div>
  );
};

export { ActivityTimelineFeed };
