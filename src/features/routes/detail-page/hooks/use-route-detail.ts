"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useQuery, useQueryClient } from "react-query";

import { getSocket, initializeSocket, onRealtimeResync } from "@/socket";
import { useOperationsSubscription } from "@/hooks/use-operations-subscription";

import {
  getRoute,
  type RouteDetailResult,
  type RouteDriverPosition,
} from "@/actions/route/get-route";
import { STALE_ACTION_MESSAGE, isStaleActionResult } from "@/lib/action-result";

import { isNewerPosition } from "@/features/control-tower/lib/live-positions";

import { routeEventDecision } from "../../lib/route-event-decision";
import {
  ROUTE_POSITION_CLOCK_MS,
  isRouteOnTheRoad,
  routeDriverPosition,
} from "../../lib/live-route-position";
import { routeTrailRoot } from "../../lib/route-query-keys";
import {
  createOwnPlanWrites,
  type OwnPlanWrites,
} from "../../lib/own-plan-writes";

/** The key every route screen shares, so a write elsewhere refreshes this. */
const ROUTE_DETAIL_QUERY_KEY = "route-detail";

const routeDetailKey = (routeId: string) =>
  [ROUTE_DETAIL_QUERY_KEY, routeId] as const;

interface UseRouteDetailProps {
  businessId: string;
  routeId: string;
  initial: RouteDetailResult;

  /** /admin: the MASTER asks to join the company's operations room. */
  admin: boolean;

  /**
   * Whether the dispatcher holds an unsaved order right now: a change by
   * somebody else is then held, not applied. A ref, because the order lives
   * in a hook that reads this one's data.
   */
  holdRef: MutableRefObject<boolean>;
}

interface PositionEvent {
  driverId: string;
  routeId?: string | null;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
}

function isPositionEvent(value: unknown): value is PositionEvent {
  if (!value || typeof value !== "object") return false;

  const event = value as Record<string, unknown>;

  return (
    typeof event.driverId === "string" &&
    typeof event.latitude === "number" &&
    typeof event.longitude === "number" &&
    typeof event.recordedAt === "string"
  );
}

/**
 * The route, kept live (decision 14.7, §5.7).
 *
 * The first read comes from the server; afterwards every `routeEvent` about
 * THIS route refetches it — the payload is a hint, never data. While the
 * dispatcher holds an unsaved order, a plan change by somebody else is not
 * applied under their hands: `staleNotice` turns on and the page offers
 * "Recarregar". The driver's dot moves with `driverPosition`, only for this
 * route, only forward in time and only while the route is on the road; it
 * ages on the Torre's clock (lib/live-route-position).
 */
function useRouteDetail({
  businessId,
  routeId,
  initial,
  admin,
  holdRef,
}: UseRouteDetailProps) {
  const queryClient = useQueryClient();

  useOperationsSubscription(admin ? businessId : undefined);

  const query = useQuery(
    routeDetailKey(routeId),
    async () => {
      const answer = await getRoute(businessId, routeId);

      if (isStaleActionResult(answer, { background: true })) {
        throw new Error(STALE_ACTION_MESSAGE);
      }

      if (!answer.success || !answer.data) throw new Error(answer.message);

      return answer.data;
    },
    {
      initialData: initial,
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    },
  );

  const data = query.data ?? initial;

  const [livePosition, setLivePosition] = useState<RouteDriverPosition | null>(
    null,
  );

  const [staleNotice, setStaleNotice] = useState<boolean>(false);

  // The clock that ages the dot between two reads (fresh -> sem reportar).
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(
      () => setNow(Date.now()),
      ROUTE_POSITION_CLOCK_MS,
    );

    return () => clearInterval(timer);
  }, []);

  const onTheRoad = isRouteOnTheRoad(data.route.status);

  // Read inside the socket handler without re-binding it on every keystroke.
  const versionRef = useRef<number>(data.route.plan_version ?? 0);
  const driverRef = useRef<string>(data.route.driverId);
  const onTheRoadRef = useRef<boolean>(onTheRoad);

  versionRef.current = data.route.plan_version ?? 0;
  driverRef.current = data.route.driverId;
  onTheRoadRef.current = onTheRoad;

  // A route that completed or was cancelled keeps no live dot of its own.
  useEffect(() => {
    if (!onTheRoad) setLivePosition(null);
  }, [onTheRoad]);

  // What a routeEvent does, read fresh by the tracker below (it is created
  // once and outlives renders).
  const deliverRef = useRef<
    (incoming: unknown, own: ReadonlySet<number>) => void
  >(() => undefined);

  deliverRef.current = (incoming, ownVersions) => {
    const decision = routeEventDecision(incoming, {
      routeId,
      knownPlanVersion: versionRef.current,
      holdingLocalChanges: holdRef.current,
      ownVersions,
    });

    if (decision === "refetch") {
      void queryClient.invalidateQueries(routeDetailKey(routeId));

      // The trail grows with every stop worked; it was read once and kept.
      void queryClient.invalidateQueries(routeTrailRoot(routeId));
    }

    if (decision === "hold") setStaleNotice(true);
  };

  // The page's own plan writes go through `trackWrite`, so their echo (which
  // the API sends before it answers) is never "somebody else".
  const ownWritesRef = useRef<OwnPlanWrites | null>(null);

  if (!ownWritesRef.current) {
    ownWritesRef.current = createOwnPlanWrites((incoming, own) =>
      deliverRef.current(incoming, own),
    );
  }

  const ownWrites = ownWritesRef.current;

  useEffect(() => {
    let disposed = false;
    let bound: ReturnType<typeof getSocket> = null;

    const refetch = () => {
      void queryClient.invalidateQueries(routeDetailKey(routeId));
      void queryClient.invalidateQueries(routeTrailRoot(routeId));
    };

    const handleRoute = (incoming: unknown) => {
      if (disposed) return;

      ownWrites.receive(incoming);
    };

    const handlePosition = (incoming: unknown) => {
      if (disposed || !isPositionEvent(incoming)) return;

      // Only THIS route's driver, on this route: another route's dot never
      // lands on this map.
      if (incoming.driverId !== driverRef.current) return;
      if (incoming.routeId && incoming.routeId !== routeId) return;

      // A finished route's phone may still report for the driver's next one.
      if (!onTheRoadRef.current) return;

      // `fresh` is decided where the dot is drawn, from when it was recorded:
      // a backlog's newest point can be forty minutes old (UI-TWR-4).
      setLivePosition((current) =>
        current && !isNewerPosition(incoming.recordedAt, current.recordedAt)
          ? current
          : {
              latitude: incoming.latitude,
              longitude: incoming.longitude,
              speed: incoming.speed ?? null,
              heading: incoming.heading ?? null,
              recordedAt: incoming.recordedAt,
              fresh: false,
            },
      );
    };

    const bind = async () => {
      const socket = getSocket() ?? (await initializeSocket());

      if (disposed) return;

      bound = socket;

      socket.on("routeEvent", handleRoute);
      socket.on("driverPosition", handlePosition);
    };

    void bind().catch(() => undefined);

    // What a reconnection missed has no replay: read it again.
    const stopResync = onRealtimeResync(refetch);

    return () => {
      disposed = true;

      bound?.off("routeEvent", handleRoute);
      bound?.off("driverPosition", handlePosition);

      stopResync();
    };
  }, [queryClient, routeId, ownWrites]);

  const reload = async () => {
    setStaleNotice(false);
    await query.refetch();
  };

  // The read's dot, unless the socket brought a newer one, aged on the
  // clock. Memoised on its inputs: the map redraws the truck when it changes.
  const fetchedPosition = data.route.driverPosition ?? null;

  const driverPosition = useMemo(
    () =>
      routeDriverPosition({
        fetched: fetchedPosition,
        live: livePosition,
        routeStatus: data.route.status,
        now,
      }),
    [fetchedPosition, livePosition, data.route.status, now],
  );

  return {
    data,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    driverPosition,
    staleNotice,
    dismissStale: () => setStaleNotice(false),
    reload,
    refetch: () => queryClient.invalidateQueries(routeDetailKey(routeId)),
    trackWrite: ownWrites.track,
  };
}

export { routeDetailKey, useRouteDetail };
