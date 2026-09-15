"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "react-query";

import {
  ArrowDown,
  ArrowUp,
  Loader,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { getRoute, type RouteStop } from "@/actions/route/get-route";
import {
  addRouteStops,
  removeRouteStop,
  reorderRouteStops,
} from "@/actions/route/route-operations";

import { listRoutableDeliveries } from "@/actions/delivery/list-routable-deliveries";
import { revalidateTagName } from "@/actions/revalidate";

import { ROUTE_STOP_STATUS_META, moveStop } from "../lib/status";

interface RouteStopsDialogProps {
  businessId: string;
  routeId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Where the dispatcher decides which addresses the driver visits, and in which
 * order.
 *
 * Reordering is done with up/down buttons rather than dragging. Dragging looks
 * better in a screenshot and is worse here: a route can carry dozens of
 * addresses in a scrolling dialog, dragging across a scroll boundary is
 * fiddly with a mouse and unusable with a keyboard, and the dispatchers who
 * use this most are moving one stop two places, not shuffling the lot.
 *
 * The order is only SENT when saved, as one complete list — which is what the
 * API takes. A move-by-move API would let two dispatchers editing the same
 * route silently produce an order neither asked for.
 */
const RouteStopsDialog = ({
  businessId,
  routeId,
  isOpen,
  onClose,
}: RouteStopsDialogProps): JSX.Element => {
  const queryClient = useQueryClient();

  const [orderedStops, setOrderedStops] = useState<RouteStop[]>([]);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const [search, setSearch] = useState<string>("");
  const [appliedSearch, setAppliedSearch] = useState<string>("");

  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, setIsPending] = useState<boolean>(false);

  const {
    data: routeResponse,
    isLoading,
    refetch,
  } = useQuery(["route-detail", routeId], () => getRoute(businessId, routeId), {
    refetchOnWindowFocus: false,
  });

  const route = routeResponse?.data?.route;

  const { data: candidatesResponse, isFetching: isSearching } = useQuery(
    ["routable-deliveries", businessId, appliedSearch],
    () => listRoutableDeliveries(businessId, appliedSearch),
    { refetchOnWindowFocus: false },
  );

  // The server order is the truth until the dispatcher moves something; after
  // that the local one is, and "Salvar ordem" is what reconciles them.
  useEffect(() => {
    if (!route || isDirty) return;

    setOrderedStops(route.stops);
  }, [route, isDirty]);

  const alreadyOnRoute = new Set(
    (route?.stops ?? []).map((stop) => stop.deliveryId),
  );

  const candidates = (candidatesResponse?.data ?? []).filter(
    (delivery) => !alreadyOnRoute.has(delivery.id),
  );

  const move = (index: number, direction: -1 | 1) => {
    const next = moveStop(orderedStops, index, direction);

    if (!next) return;

    setOrderedStops(next);
    setIsDirty(true);
  };

  const afterWrite = async () => {
    setIsDirty(false);
    setSelected([]);

    await refetch();
    await queryClient.invalidateQueries(["routable-deliveries"]);

    await revalidateTagName("update-route");
  };

  const handleSaveOrder = async () => {
    setIsPending(true);

    try {
      const response = await reorderRouteStops(
        businessId,
        routeId,
        orderedStops.map((stop) => stop.id),
      );

      if (!response.success) {
        toast.error(response.message);

        // A refused order means this screen was describing a route somebody
        // else has changed. Reloading is the only honest next step — keeping
        // the stale list would invite the dispatcher to try again forever.
        setIsDirty(false);
        await refetch();

        return;
      }

      toast.success(response.message);
      await afterWrite();
    } finally {
      setIsPending(false);
    }
  };

  const handleRemove = async (stopId: string) => {
    setIsPending(true);

    try {
      const response = await removeRouteStop(businessId, routeId, stopId);

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);
      await afterWrite();
    } finally {
      setIsPending(false);
    }
  };

  const handleAdd = async () => {
    if (selected.length === 0) return;

    setIsPending(true);

    try {
      const response = await addRouteStops(businessId, routeId, selected);

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);
      await afterWrite();
    } finally {
      setIsPending(false);
    }
  };

  const toggle = (deliveryId: string) => {
    setSelected((current) =>
      current.includes(deliveryId)
        ? current.filter((id) => id !== deliveryId)
        : [...current, deliveryId],
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogScrollContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Paradas da rota {route?.code ?? ""}
          </DialogTitle>
          <DialogDescription>
            A ordem aqui é a ordem em que o motorista vai visitar os endereços.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Na rota ({orderedStops.length})
              </p>

              {isDirty && (
                <Button
                  size="sm"
                  onClick={() => void handleSaveOrder()}
                  disabled={isPending}
                >
                  <span>Salvar ordem</span>
                  {isPending && (
                    <div className="ml-2 animate-spin">
                      <Loader className="h-3 w-3" />
                    </div>
                  )}
                </Button>
              )}
            </div>

            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            )}

            {!isLoading && orderedStops.length === 0 && (
              <div
                className="flex h-32 items-center justify-center rounded-lg
                border-2 border-dashed"
              >
                <p className="text-sm text-muted-foreground">
                  Nenhuma parada ainda. Escolha entregas ao lado.
                </p>
              </div>
            )}

            <ol className="space-y-2">
              {orderedStops.map((stop, index) => (
                <li
                  key={stop.id}
                  className="flex items-center gap-2 rounded-md border p-2"
                >
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center
                    justify-center rounded-full bg-muted text-xs font-medium"
                  >
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {stop.delivery.recipient_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {stop.delivery.city}/{stop.delivery.uf}
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className={`flex-shrink-0 ${
                      ROUTE_STOP_STATUS_META[stop.status].badgeClassName
                    }`}
                  >
                    {ROUTE_STOP_STATUS_META[stop.status].label}
                  </Badge>

                  <div className="flex flex-shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Mover ${stop.delivery.recipient_name} para cima`}
                      disabled={index === 0 || isPending}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Mover ${stop.delivery.recipient_name} para baixo`}
                      disabled={index === orderedStops.length - 1 || isPending}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600"
                      aria-label={`Remover ${stop.delivery.recipient_name} da rota`}
                      disabled={isPending}
                      onClick={() => void handleRemove(stop.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>

            {isDirty && (
              <p className="text-xs text-amber-700">
                A nova ordem ainda não foi salva.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <p className="text-sm font-medium">Entregas pendentes</p>

            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setAppliedSearch(search);
              }}
            >
              <Input
                value={search}
                placeholder="Destinatário, código, cidade..."
                onChange={(event) => setSearch(event.target.value)}
              />

              <Button type="submit" variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            {isSearching && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            )}

            {!isSearching && candidates.length === 0 && (
              <div
                className="flex h-32 items-center justify-center rounded-lg
                border-2 border-dashed"
              >
                <p className="px-4 text-center text-sm text-muted-foreground">
                  {appliedSearch
                    ? "Nenhuma entrega pendente encontrada com esse termo."
                    : "Nenhuma entrega pendente disponível."}
                </p>
              </div>
            )}

            <ul className="space-y-2">
              {candidates.map((delivery) => (
                <li
                  key={delivery.id}
                  className="flex items-center gap-2 rounded-md border p-2"
                >
                  <Checkbox
                    id={`pick-${delivery.id}`}
                    checked={selected.includes(delivery.id)}
                    onCheckedChange={() => toggle(delivery.id)}
                  />

                  <label
                    htmlFor={`pick-${delivery.id}`}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <p className="truncate text-sm font-medium">
                      {delivery.recipient_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {delivery.city}/{delivery.uf}
                      {delivery.code ? ` · ${delivery.code}` : ""}
                      {/* The signal a dispatcher reads before picking: this
                      address may already be somebody's morning. */}
                      {delivery.driver
                        ? ` · já designada a ${delivery.driver.name}`
                        : ""}
                    </p>
                  </label>
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              disabled={selected.length === 0 || isPending}
              onClick={() => void handleAdd()}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span>
                {selected.length === 0
                  ? "Adicionar à rota"
                  : selected.length === 1
                    ? "Adicionar 1 parada"
                    : `Adicionar ${selected.length} paradas`}
              </span>
            </Button>
          </section>
        </div>
      </DialogScrollContent>
    </Dialog>
  );
};

export { RouteStopsDialog };
