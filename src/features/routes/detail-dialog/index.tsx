"use client";

import { useQuery } from "react-query";

import { MapPin, TriangleAlert, Truck, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Skeleton } from "@/components/ui/skeleton";

import { getRoute } from "@/actions/route/get-route";
import { displayValue, formatNotificationDate } from "@/lib/format-values";

import {
  ROUTE_STATUS_META,
  ROUTE_STOP_STATUS_META,
} from "../lib/status";

interface RouteDetailDialogProps {
  businessId: string;
  routeId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The route as it stands: who is driving it, in what, and what is left.
 *
 * Read-only on purpose. Everything that changes a route has its own entry in
 * the row menu, each with the confirmation the act deserves — a detail panel
 * that also cancelled routes would put a destructive action one stray click
 * from a scroll.
 */
const RouteDetailDialog = ({
  businessId,
  routeId,
  isOpen,
  onClose,
}: RouteDetailDialogProps): JSX.Element => {
  const { data: response, isLoading } = useQuery(
    ["route-detail", routeId],
    () => getRoute(businessId, routeId),
    { refetchOnWindowFocus: false },
  );

  const route = response?.data?.route;
  const progress = response?.data?.progress;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Rota {route?.code ?? ""}</span>

            {route && (
              <Badge
                variant="outline"
                className={ROUTE_STATUS_META[route.status].badgeClassName}
              >
                {ROUTE_STATUS_META[route.status].label}
              </Badge>
            )}
          </DialogTitle>

          <DialogDescription>
            {route?.name ?? "Sem nome definido"}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        )}

        {!isLoading && !route && (
          <div
            className="flex h-40 flex-col items-center justify-center
            rounded-lg border-2 border-dashed"
          >
            {/* Not `Loader`: a stopped spinner over the words "não foi
                possível carregar" says the screen is still trying. The stops
                dialog uses TriangleAlert for the same failure. */}
            <TriangleAlert className="mb-3 h-6 w-6 text-muted-foreground" />
            <p className="max-w-md text-center text-sm text-muted-foreground">
              {response?.message ?? "Não foi possível carregar a rota."}
            </p>
          </div>
        )}

        {route && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-2">
                <UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Motorista</p>
                  <p className="truncate text-sm font-medium">
                    {displayValue(route.driver?.name)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Truck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Veículo</p>
                  <p className="truncate text-sm font-medium">
                    {displayValue(route.vehicle?.license_plate)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Progresso</p>
                  <p className="truncate text-sm font-medium">
                    {progress
                      ? `${progress.done} de ${progress.total} resolvidas`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p>
                  {displayValue(
                    formatNotificationDate(route.scheduled_date, "pt-BR"),
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Saída</p>
                <p>
                  {route.started_at
                    ? formatNotificationDate(route.started_at, "pt-BR")
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Encerramento</p>
                <p>
                  {route.completed_at
                    ? formatNotificationDate(route.completed_at, "pt-BR")
                    : "—"}
                </p>
              </div>
            </div>

            {/* The dark half was missing: `bg-red-50` with `text-red-800`
                and no `dark:` pair renders a pale pink block of dark red text
                on a dark background. Every other red panel in the product
                carries both. */}
            {route.cancellation_reason && (
              <div
                className="rounded-md border border-red-200 bg-red-50/50 p-3
                dark:border-red-900/50 dark:bg-red-950/20"
              >
                <p className="text-xs font-medium text-red-800 dark:text-red-200">
                  Motivo do cancelamento
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {route.cancellation_reason}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">
                Paradas, na ordem que o motorista segue
              </p>

              {route.stops.length === 0 ? (
                <div
                  className="flex h-28 items-center justify-center rounded-lg
                  border-2 border-dashed"
                >
                  <p className="text-sm text-muted-foreground">
                    Esta rota ainda não tem paradas.
                  </p>
                </div>
              ) : (
                <ol className="space-y-2">
                  {route.stops.map((stop, index) => {
                    const meta = ROUTE_STOP_STATUS_META[stop.status];

                    return (
                      <li
                        key={stop.id}
                        className="flex items-start gap-3 rounded-md border p-3"
                      >
                        {/* The position, not the stored sequence: sequences are
                        spaced by ten so an insert is cheap, and showing "20"
                        for the second address would be nonsense to a human. */}
                        <span
                          className="flex h-6 w-6 flex-shrink-0 items-center
                          justify-center rounded-full bg-muted text-xs
                          font-medium"
                        >
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {stop.delivery.recipient_name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {stop.delivery.street}
                            {stop.delivery.address_number
                              ? `, ${stop.delivery.address_number}`
                              : ""}
                            {stop.delivery.neighborhood
                              ? ` — ${stop.delivery.neighborhood}`
                              : ""}
                            {` · ${stop.delivery.city}/${stop.delivery.uf}`}
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          className={`flex-shrink-0 ${meta.badgeClassName}`}
                        >
                          {meta.label}
                        </Badge>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { RouteDetailDialog };
