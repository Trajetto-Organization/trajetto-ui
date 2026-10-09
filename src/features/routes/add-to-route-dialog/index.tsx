"use client";

import { useState } from "react";
import { useInfiniteQuery, useQuery } from "react-query";
import { usePathname, useRouter } from "next/navigation";
import { Loader, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateOnly } from "@/lib/format-values";
import { STALE_ACTION_MESSAGE, isStaleActionResult } from "@/lib/action-result";
import { revalidateTagName } from "@/actions/revalidate";

import {
  addRouteStops,
  listOpenRoutes,
  listOpenStops,
  moveRouteStops,
  type OpenRouteOption,
} from "@/actions/route/route-operations";

import { RouteFormDialog } from "../form-dialog";
import { ROUTE_STATUS_META, type RouteStatus } from "../lib/status";
import {
  addedToRouteMessage,
  movingSummary,
  planSelection,
} from "../lib/add-to-route";
import { routeDetailHref } from "../lib/route-links";

interface SelectedDelivery {
  id: string;
  code?: string | null;
  recipient_name: string;
}

interface AddToRouteDialogProps {
  businessId: string;
  deliveries: SelectedDelivery[];
  isOpen: boolean;
  onClose: () => void;

  /** After the deliveries landed on a route: the table clears its selection. */
  onAdded: () => void;
}

type Mode = "existing" | "new";

/**
 * "Adicionar à rota" (decision 14.7, D9, §5.6): the deliveries go to a route
 * that has not left — an existing one, or a new one planned here — and the
 * route is NOT released: liberar is always the dispatcher's own gesture, on
 * the route's page. Deliveries already on another route that has not left
 * are moved in the same transaction (move-stops); one on a route that left
 * blocks the confirm, said by name.
 */
const AddToRouteDialog = ({
  businessId,
  deliveries,
  isOpen,
  onClose,
  onAdded,
}: AddToRouteDialogProps): JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();

  const [mode, setMode] = useState<Mode>("existing");
  const [search, setSearch] = useState<string>("");
  const [chosen, setChosen] = useState<OpenRouteOption | null>(null);
  const [isNewOpen, setIsNewOpen] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  const debounced = useDebouncedValue(search, 300);
  const ids = deliveries.map((delivery) => delivery.id);

  const labelOf = (id: string) => {
    const delivery = deliveries.find((entry) => entry.id === id);

    return delivery?.code ?? delivery?.recipient_name ?? id;
  };

  const openStops = useQuery(
    ["open-stops", businessId, ids.join(",")],
    async () => {
      const answer = await listOpenStops(businessId, ids);

      if (isStaleActionResult(answer, { background: true })) {
        throw new Error(STALE_ACTION_MESSAGE);
      }

      if (!answer.success) throw new Error(answer.message);

      return answer.data ?? [];
    },
    { enabled: isOpen && ids.length > 0, refetchOnWindowFocus: false },
  );

  const routes = useInfiniteQuery(
    ["open-routes", businessId, debounced],
    async ({ pageParam = 1 }) => {
      const answer = await listOpenRoutes(
        businessId,
        debounced,
        pageParam as number,
      );

      if (isStaleActionResult(answer, { background: true })) {
        throw new Error(STALE_ACTION_MESSAGE);
      }

      if (!answer.success || !answer.data) throw new Error(answer.message);

      return { ...answer.data, page: pageParam as number };
    },
    {
      enabled: isOpen && mode === "existing",
      refetchOnWindowFocus: false,
      getNextPageParam: (last, pages) => {
        const loaded = pages.reduce((sum, page) => sum + page.data.length, 0);

        return loaded < last.total ? last.page + 1 : undefined;
      },
    },
  );

  // Only an existing route can already hold some of these. In "Nova rota" a
  // route clicked before switching is not the target: deliveries on it are
  // moved to the new one like any other.
  const targetRouteId = mode === "existing" ? (chosen?.id ?? null) : null;

  const plan = planSelection(ids, openStops.data ?? [], targetRouteId);
  const moving = movingSummary(plan.moving);

  const blockedMessage =
    plan.blocked.length > 0
      ? `Estas entregas estão numa rota que já saiu e não podem ser movidas: ${plan.blocked
          .map(
            (entry) => `${labelOf(entry.deliveryId)} (Rota ${entry.routeCode})`,
          )
          .join(", ")}. Desmarque-as.`
      : null;

  const finish = async (
    route: { id: string; code: number },
    added: number,
    isNew: boolean,
  ) => {
    toast.success(addedToRouteMessage(added, route.code), {
      description: isNew
        ? "A rota está em planejamento — libere quando estiver pronta."
        : undefined,
      action: {
        label: "Abrir rota",
        onClick: () =>
          router.push(routeDetailHref(pathname, route.id, businessId)),
      },
    });

    await revalidateTagName("update-delivery").catch(() => undefined);
    router.refresh();

    onAdded();
    onClose();
  };

  /** Into a route that exists: add-stops, or move-stops if anything moves. */
  const sendTo = async (
    route: { id: string; code: number },
    isNew: boolean,
  ) => {
    setIsSending(true);

    try {
      const deliveryIds = [
        ...plan.free,
        ...plan.moving.map((entry) => entry.deliveryId),
      ];

      if (deliveryIds.length === 0) {
        toast.info("Essas entregas já estão nesta rota.");
        onClose();
        return;
      }

      const answer =
        plan.operation === "move"
          ? await moveRouteStops(businessId, route.id, deliveryIds)
          : await addRouteStops(businessId, route.id, deliveryIds);

      if (isStaleActionResult(answer)) return;

      if (!answer.success || !answer.data) {
        toast.error(answer.message);
        await openStops.refetch();
        return;
      }

      const data = answer.data as { added: number; alreadyOnRoute: string[] };

      await finish(route, data.added + data.alreadyOnRoute.length, isNew);
    } finally {
      setIsSending(false);
    }
  };

  const options = routes.data?.pages.flatMap((page) => page.data) ?? [];

  const canConfirm =
    !isSending &&
    !openStops.isLoading &&
    !openStops.isError &&
    !blockedMessage &&
    (mode === "new" || chosen !== null);

  const count = deliveries.length;

  return (
    <>
      <Dialog
        open={isOpen && !isNewOpen}
        onOpenChange={(open) => !open && onClose()}
      >
        <DialogScrollContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Adicionar à rota</DialogTitle>
            <DialogDescription>
              {count === 1
                ? "1 entrega selecionada"
                : `${count} entregas selecionadas`}
              . A rota não é liberada aqui: libere-a na página dela quando
              estiver pronta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div
              role="radiogroup"
              aria-label="Para qual rota"
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {(
                [
                  ["existing", "Rota existente"],
                  ["new", "Nova rota"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => setMode(value)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    mode === value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {openStops.isLoading && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader className="h-4 w-4 animate-spin" aria-hidden />
                Verificando em que rota estão as entregas...
              </p>
            )}

            {openStops.isError && (
              <p className="text-sm text-destructive">
                {(openStops.error as Error).message}
              </p>
            )}

            {moving && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                {moving}
              </p>
            )}

            {blockedMessage && (
              <p role="alert" className="text-sm text-destructive">
                {blockedMessage}
              </p>
            )}

            {mode === "existing" && (
              <div className="space-y-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rota, motorista ou destino..."
                    aria-label="Buscar rota em planejamento ou liberada"
                    className="pl-8"
                  />
                </div>

                <div
                  role="radiogroup"
                  aria-label="Rotas em planejamento ou liberadas"
                  className="max-h-72 space-y-2 overflow-y-auto overscroll-contain"
                >
                  {routes.isLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Carregando rotas...
                    </p>
                  ) : options.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma rota em planejamento ou liberada. Crie uma em
                      “Nova rota”.
                    </p>
                  ) : (
                    options.map((option) => {
                      const meta =
                        ROUTE_STATUS_META[option.status as RouteStatus];
                      const active = chosen?.id === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setChosen(option)}
                          className={`flex w-full min-w-0 items-start justify-between gap-2
                          rounded-md border p-2 text-left text-sm focus-visible:outline-none
                          focus-visible:ring-2 focus-visible:ring-ring ${
                            active
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted"
                          }`}
                        >
                          <span className="min-w-0 space-y-0.5">
                            <span className="block truncate font-medium">
                              Rota {option.code}
                              {option.name ? ` · ${option.name}` : ""}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {[
                                option.driver?.name,
                                option.vehicle?.license_plate,
                                formatDateOnly(option.scheduled_date, {
                                  fallback: "",
                                }),
                                option.stopCount === 1
                                  ? "1 parada"
                                  : `${option.stopCount} paradas`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>

                          {meta && (
                            <Badge
                              variant="outline"
                              className={`shrink-0 ${meta.badgeClassName}`}
                            >
                              {meta.label}
                            </Badge>
                          )}
                        </button>
                      );
                    })
                  )}

                  {routes.hasNextPage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={routes.isFetchingNextPage}
                      onClick={() => void routes.fetchNextPage()}
                    >
                      Carregar mais
                    </Button>
                  )}
                </div>
              </div>
            )}

            {mode === "new" && (
              <p className="text-sm text-muted-foreground">
                Você escolhe o motorista, o veículo, o dia e o destino; a rota
                nasce em planejamento com estas entregas.
              </p>
            )}
          </div>

          <DialogFormFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSending}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              disabled={!canConfirm}
              onClick={() => {
                if (mode === "new") {
                  setIsNewOpen(true);
                  return;
                }

                if (chosen) void sendTo(chosen, false);
              }}
            >
              {isSending && (
                <Loader className="mr-1 h-4 w-4 animate-spin" aria-hidden />
              )}
              {mode === "new" ? "Planejar nova rota" : "Adicionar"}
            </Button>
          </DialogFormFooter>
        </DialogScrollContent>
      </Dialog>

      {isNewOpen && (
        <RouteFormDialog
          businessId={businessId}
          isOpen={isNewOpen}
          // Free deliveries are born on the route, atomically; a selection
          // that moves some from another route is created empty and then
          // moved in one transaction (move-stops).
          deliveryIds={plan.operation === "add" ? plan.free : undefined}
          onClose={() => setIsNewOpen(false)}
          onCreated={async (created) => {
            if (plan.operation === "add") {
              await finish(created, plan.free.length, true);
              return;
            }

            await sendTo(created, true);
          }}
        />
      )}
    </>
  );
};

export { AddToRouteDialog };
