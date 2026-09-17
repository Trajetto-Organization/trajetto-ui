"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "react-query";

import {
  ArrowDown,
  ArrowUp,
  Loader,
  MapPin,
  PackageSearch,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { getRoute, type RouteStop } from "@/actions/route/get-route";
import {
  addRouteStops,
  removeRouteStop,
  reorderRouteStops,
} from "@/actions/route/route-operations";

import { listRoutableDeliveries } from "@/actions/delivery/list-routable-deliveries";
import { revalidateTagName } from "@/actions/revalidate";

import { formatNotificationDate } from "@/lib/format-values";

import {
  ROUTE_STATUS_META,
  ROUTE_STOP_STATUS_META,
  moveStop,
} from "../lib/status";

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
 * Laid out as a workbench rather than a form: a fixed header naming the route
 * being edited, two panes that scroll on their own, and a footer that is the
 * only place an action lives. The first version put the save button inside a
 * column heading, where it appeared and disappeared with the dirty state and
 * pushed the list down as it did; and it had no footer at all, so the panel
 * simply ran out, with a permanently greyed full-width button as its last
 * element.
 *
 * Reordering is done with up/down buttons rather than dragging. Dragging looks
 * better in a screenshot and is worse here: a route can carry dozens of
 * addresses in a scrolling pane, dragging across a scroll boundary is fiddly
 * with a mouse and unusable with a keyboard, and the dispatchers who use this
 * most are moving one stop two places, not shuffling the lot.
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

  const [isDiscardOpen, setIsDiscardOpen] = useState<boolean>(false);

  // Whether the board behind this panel is now out of date.
  const [hasWritten, setHasWritten] = useState<boolean>(false);

  const {
    data: routeResponse,
    isLoading,
    refetch,
  } = useQuery(["route-detail", routeId], () => getRoute(businessId, routeId), {
    refetchOnWindowFocus: false,
  });

  const route = routeResponse?.data?.route;

  // A failed read is not an empty route. Saying "nenhuma parada ainda" over a
  // 500 would invite the dispatcher to rebuild a route that already exists.
  const loadFailed = !isLoading && routeResponse?.success === false;

  const {
    data: candidatesResponse,
    isFetching: isSearching,
    refetch: refetchCandidates,
  } = useQuery(
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

  /**
   * After a write, this panel refreshes ITSELF and nothing else.
   *
   * It used to revalidate the page's cache tag on every add, remove and
   * reorder, and that closed the panel: the board is an async server
   * component behind a Suspense boundary, so invalidating its tag re-suspends
   * it, swaps in the loading skeleton, and unmounts the table — including the
   * row this dialog is rendered from, and with it the state that keeps it
   * open. Adding a stop threw the dispatcher back to the board.
   *
   * The board is brought up to date once, on the way out. Nobody is reading it
   * while a modal covers it.
   */
  const afterWrite = async () => {
    setIsDirty(false);
    setSelected([]);
    setHasWritten(true);

    await refetch();
    await queryClient.invalidateQueries(["routable-deliveries"]);
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

  /**
   * Every way out goes through here.
   *
   * ESC, the X and Cancelar all close the panel, as they should — but a
   * reorder that has not been saved is work, and losing it to a stray key is
   * the kind of small betrayal that teaches people to distrust a screen. So
   * when there is unsaved order, the exit asks first. Clicking outside does
   * not close at all: it is the one gesture nobody makes on purpose.
   */
  const close = () => {
    // Not awaited: the panel closes now, and the board catches up a moment
    // later. Waiting on a server action here would leave the dialog sitting
    // open after the user asked for it to go.
    if (hasWritten) void revalidateTagName("update-route");

    onClose();
  };

  const requestClose = () => {
    if (isDirty) {
      setIsDiscardOpen(true);
      return;
    }

    close();
  };

  const statusMeta = route ? ROUTE_STATUS_META[route.status] : null;

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(next) => {
          if (!next) requestClose();
        }}
      >
        <DialogContent
          className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl
          flex-col gap-0 p-0 sm:w-full"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="space-y-2 border-b px-6 py-5 pr-14">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-left">
                Paradas da Rota {route?.code ?? ""}
              </DialogTitle>

              {statusMeta && (
                <Badge variant="outline" className={statusMeta.badgeClassName}>
                  {statusMeta.label}
                </Badge>
              )}
            </div>

            <DialogDescription className="text-left">
              {/* Which route this is, before which addresses are on it: the
              dispatcher opened this from a board of many. */}
              {route ? (
                <>
                  {route.driver?.name ?? "Sem motorista"}
                  {" · "}
                  {formatNotificationDate(route.scheduled_date, "pt-BR")}
                  {" · a ordem abaixo é a ordem em que o motorista vai visitar os endereços."}
                </>
              ) : (
                "A ordem abaixo é a ordem em que o motorista vai visitar os endereços."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {loadFailed ? (
              <div
                className="flex flex-col items-center justify-center gap-3
                rounded-lg border border-dashed py-12 text-center"
              >
                <TriangleAlert className="h-6 w-6 text-muted-foreground" />

                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Não foi possível carregar as paradas desta rota.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {routeResponse?.message}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  <span>Tentar de novo</span>
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="flex min-w-0 flex-col gap-3">
                  <header className="flex items-baseline gap-2">
                    <h3 className="text-sm font-semibold">Na rota</h3>
                    <span className="text-sm text-muted-foreground">
                      {orderedStops.length === 0
                        ? "nenhuma parada"
                        : orderedStops.length === 1
                          ? "1 parada"
                          : `${orderedStops.length} paradas`}
                    </span>
                  </header>

                  {isLoading && (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-16 w-full" />
                      ))}
                    </div>
                  )}

                  {!isLoading && orderedStops.length === 0 && (
                    <div
                      className="flex flex-col items-center justify-center gap-2
                      rounded-lg border border-dashed px-6 py-10 text-center"
                    >
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        Esta rota ainda não tem paradas
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Escolha entregas pendentes ao lado e adicione-as à rota.
                      </p>
                    </div>
                  )}

                  {orderedStops.length > 0 && (
                    <ol className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
                      {orderedStops.map((stop, index) => (
                        <li
                          key={stop.id}
                          className="flex items-start gap-3 rounded-lg border
                          bg-card p-3"
                        >
                          <span
                            className="mt-0.5 flex h-6 w-6 flex-shrink-0
                            items-center justify-center rounded-full bg-muted
                            text-xs font-semibold tabular-nums"
                          >
                            {index + 1}
                          </span>

                          <div className="min-w-0 flex-1 space-y-1">
                            <p
                              className="truncate text-sm font-medium"
                              title={stop.delivery.recipient_name}
                            >
                              {stop.delivery.recipient_name}
                            </p>

                            {/* The street is what the driver reads; the city
                            alone told the dispatcher nothing they did not
                            already know from the route. */}
                            <p className="truncate text-xs text-muted-foreground">
                              {stop.delivery.street}
                              {stop.delivery.address_number
                                ? `, ${stop.delivery.address_number}`
                                : ""}
                              {" — "}
                              {stop.delivery.city}/{stop.delivery.uf}
                            </p>

                            <Badge
                              variant="outline"
                              className={
                                ROUTE_STOP_STATUS_META[stop.status]
                                  .badgeClassName
                              }
                            >
                              {ROUTE_STOP_STATUS_META[stop.status].label}
                            </Badge>
                          </div>

                          <div className="flex flex-shrink-0 items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Mover ${stop.delivery.recipient_name} para cima`}
                              disabled={index === 0 || isPending}
                              onClick={() => move(index, -1)}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Mover ${stop.delivery.recipient_name} para baixo`}
                              disabled={
                                index === orderedStops.length - 1 || isPending
                              }
                              onClick={() => move(index, 1)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600
                              hover:text-red-600 dark:text-red-500"
                              aria-label={`Remover ${stop.delivery.recipient_name} da rota`}
                              disabled={isPending}
                              onClick={() => void handleRemove(stop.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                <section className="flex min-w-0 flex-col gap-3">
                  <header className="flex items-baseline gap-2">
                    <h3 className="text-sm font-semibold">
                      Entregas pendentes
                    </h3>
                    {!isSearching && (
                      <span className="text-sm text-muted-foreground">
                        {candidates.length === 1
                          ? "1 disponível"
                          : `${candidates.length} disponíveis`}
                      </span>
                    )}
                  </header>

                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      setAppliedSearch(search);
                    }}
                  >
                    <div className="relative flex-1">
                      <Input
                        value={search}
                        aria-label="Buscar entregas pendentes"
                        placeholder="Destinatário, código, cidade..."
                        className="pr-9"
                        onChange={(event) => setSearch(event.target.value)}
                      />

                      {search.length > 0 && (
                        // Clearing a search by selecting the text and deleting
                        // it also needs a submit; this is one gesture.
                        <button
                          type="button"
                          aria-label="Limpar busca"
                          className="absolute right-2 top-1/2 -translate-y-1/2
                          rounded-sm p-1 text-muted-foreground
                          hover:text-foreground"
                          onClick={() => {
                            setSearch("");
                            setAppliedSearch("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="outline"
                      size="icon"
                      aria-label="Buscar"
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </form>

                  {isSearching && (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-14 w-full" />
                      ))}
                    </div>
                  )}

                  {!isSearching && candidatesResponse?.success === false && (
                    <div
                      className="flex flex-col items-center justify-center gap-2
                      rounded-lg border border-dashed px-6 py-10 text-center"
                    >
                      <TriangleAlert className="h-5 w-5 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        Não foi possível buscar as entregas.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void refetchCandidates()}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        <span>Tentar de novo</span>
                      </Button>
                    </div>
                  )}

                  {!isSearching &&
                    candidatesResponse?.success !== false &&
                    candidates.length === 0 && (
                      <div
                        className="flex flex-col items-center justify-center
                        gap-2 rounded-lg border border-dashed px-6 py-10
                        text-center"
                      >
                        <PackageSearch className="h-5 w-5 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {appliedSearch
                            ? "Nenhuma entrega com esse termo"
                            : "Nenhuma entrega pendente"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appliedSearch
                            ? "Tente outro destinatário, código ou cidade."
                            : "Todas as entregas pendentes já estão em alguma rota."}
                        </p>
                      </div>
                    )}

                  {!isSearching && candidates.length > 0 && (
                    <ul className="max-h-[38vh] space-y-2 overflow-y-auto pr-1">
                      {candidates.map((delivery) => (
                        <li key={delivery.id}>
                          <label
                            htmlFor={`pick-${delivery.id}`}
                            className="flex cursor-pointer items-start gap-3
                            rounded-lg border bg-card p-3
                            hover:border-primary/40 hover:bg-accent/40
                            has-[:checked]:border-primary
                            has-[:checked]:bg-accent/60"
                          >
                            <Checkbox
                              id={`pick-${delivery.id}`}
                              className="mt-0.5"
                              checked={selected.includes(delivery.id)}
                              onCheckedChange={() => toggle(delivery.id)}
                            />

                            <div className="min-w-0 flex-1 space-y-1">
                              <p
                                className="truncate text-sm font-medium"
                                title={delivery.recipient_name}
                              >
                                {delivery.recipient_name}
                              </p>

                              <p className="truncate text-xs text-muted-foreground">
                                {delivery.city}/{delivery.uf}
                                {delivery.code ? ` · ${delivery.code}` : ""}
                              </p>

                              {/* The signal a dispatcher reads before picking:
                              this address may already be somebody's morning. */}
                              {delivery.driver && (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-100 text-amber-900
                                  border-amber-200 dark:bg-amber-950
                                  dark:text-amber-200 dark:border-amber-900"
                                >
                                  Já designada a {delivery.driver.name}
                                </Badge>
                              )}
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/*
                    Appears with the selection instead of sitting there greyed.
                    A permanently disabled full-width primary button was the
                    last thing in this column, and it read as a broken control
                    rather than as one waiting for input.
                  */}
                  {selected.length > 0 && (
                    <div
                      className="flex items-center justify-between gap-3
                      rounded-lg border bg-muted/40 p-3"
                    >
                      <p className="text-sm font-medium">
                        {selected.length === 1
                          ? "1 entrega selecionada"
                          : `${selected.length} entregas selecionadas`}
                      </p>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => setSelected([])}
                        >
                          Limpar
                        </Button>

                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => void handleAdd()}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          <span>Adicionar à rota</span>

                          {isPending && (
                            <Loader className="ml-2 h-4 w-4 animate-spin" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>

          <DialogFooter
            className="items-center gap-3 border-t px-6 py-4
            sm:justify-between"
          >
            <p
              className={`text-sm ${
                isDirty
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-muted-foreground"
              }`}
            >
              {isDirty
                ? "A nova ordem ainda não foi salva."
                : "As alterações de paradas são salvas assim que você as faz."}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={isPending}
                onClick={requestClose}
              >
                {/* "Cancelar" and not "Voltar": there is no previous step. */}
                {isDirty ? "Cancelar" : "Fechar"}
              </Button>

              <Button
                disabled={!isDirty || isPending}
                onClick={() => void handleSaveOrder()}
              >
                <span>Salvar ordem</span>

                {isPending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDiscardOpen}
        onOpenChange={setIsDiscardOpen}
        title="Descartar a nova ordem?"
        description={
          <p>
            A ordem das paradas foi alterada e ainda não foi salva. Fechar agora
            devolve a rota à ordem que o motorista já enxerga.
          </p>
        }
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        destructive
        onConfirm={() => {
          setIsDiscardOpen(false);
          setIsDirty(false);
          close();
        }}
      />
    </>
  );
};

export { RouteStopsDialog };
