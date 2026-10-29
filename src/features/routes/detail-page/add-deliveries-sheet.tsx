"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery } from "react-query";
import { Loader, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateOnly } from "@/lib/format-values";
import { STALE_ACTION_MESSAGE, isStaleActionResult } from "@/lib/action-result";

import type { RouteDetail } from "@/actions/route/get-route";
import {
  addRouteStops,
  listUnroutedDeliveries,
  type FacetCount,
  type UnroutedDelivery,
} from "@/actions/route/route-operations";

import {
  DEFAULT_PICKER_FILTERS,
  chunk,
  pickerQuery,
  toggleValue,
  type PickerFilters,
} from "../lib/unrouted-picker";
import { isPlanConflict } from "../lib/plan-conflict";
import type { OwnPlanWrites } from "../lib/own-plan-writes";
import { ROUTE_MAX_STOPS, openStopCount } from "../lib/route-blockers";

interface AddDeliveriesSheetProps {
  businessId: string;
  route: RouteDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** The plan changed under us: the page reloads it. */
  onConflict: (message: string) => Promise<void>;

  /** Something was added: the page reads the route again. */
  onAdded: () => Promise<void>;

  /** The page's own-write tracker, so the add's echo is not "somebody else". */
  trackWrite: OwnPlanWrites["track"];
}

const KIND_LABEL: Record<string, string> = {
  DELIVERY: "Entrega",
  PICKUP: "Coleta",
};

interface ChipGroupProps {
  label: string;
  options: FacetCount[];
  selected: string[];
  onToggle: (value: string) => void;
  format?: (value: string) => string;
}

/** A filter as chips with their counts (the API's disjunctive facets). */
const ChipGroup = ({
  label,
  options,
  selected,
  onToggle,
  format = (value) => value,
}: ChipGroupProps): JSX.Element | null => {
  if (options.length === 0 && selected.length === 0) return null;

  return (
    <fieldset className="min-w-0 space-y-1">
      <legend className="text-xs font-medium text-muted-foreground">
        {label}
      </legend>

      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option.value)}
              className={`max-w-full truncate rounded-full border px-2.5 py-1 text-xs
              transition-colors focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {option.label ?? format(option.value)} ({option.count})
            </button>
          );
        })}
      </div>
    </fieldset>
  );
};

/**
 * "Adicionar entregas" (decision 14.7, §5.5): the deliveries without a route
 * — PENDING and on no open stop — searched and filtered on the server, chosen
 * with checkboxes. The selection survives search and filters (kept by id) and
 * goes in batches of 100, each with the plan version the previous returned,
 * so a long selection never overwrites a colleague's change.
 */
const AddDeliveriesSheet = ({
  businessId,
  route,
  open,
  onOpenChange,
  onConflict,
  onAdded,
  trackWrite,
}: AddDeliveriesSheetProps): JSX.Element => {
  const [filters, setFilters] = useState<PickerFilters>(DEFAULT_PICKER_FILTERS);
  const [selected, setSelected] = useState<Map<string, UnroutedDelivery>>(
    new Map(),
  );
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const search = useDebouncedValue(filters.search, 300);

  const effective = useMemo(() => ({ ...filters, search }), [filters, search]);

  const room = ROUTE_MAX_STOPS - openStopCount(route);

  const query = useInfiniteQuery(
    ["unrouted-deliveries", businessId, route.id, effective],
    async ({ pageParam = 1 }) => {
      const answer = await listUnroutedDeliveries(
        businessId,
        pickerQuery(effective, route.scheduled_date, pageParam as number),
      );

      if (isStaleActionResult(answer, { background: true })) {
        throw new Error(STALE_ACTION_MESSAGE);
      }

      if (!answer.success || !answer.data) throw new Error(answer.message);

      return { ...answer.data, page: pageParam as number };
    },
    {
      enabled: open,
      refetchOnWindowFocus: false,
      getNextPageParam: (last, pages) => {
        const loaded = pages.reduce((sum, page) => sum + page.data.length, 0);

        return loaded < last.total ? last.page + 1 : undefined;
      },
    },
  );

  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  const first = query.data?.pages[0];
  const facets = first?.facets ?? { city: [], uf: [], kind: [], shipper: [] };

  const toggle = (delivery: UnroutedDelivery, checked: boolean) =>
    setSelected((current) => {
      const next = new Map(current);

      if (checked) next.set(delivery.id, delivery);
      else next.delete(delivery.id);

      return next;
    });

  const allOnScreenSelected =
    rows.length > 0 && rows.every((row) => selected.has(row.id));

  const toggleAll = (checked: boolean) =>
    setSelected((current) => {
      const next = new Map(current);

      for (const row of rows) {
        if (checked) next.set(row.id, row);
        else next.delete(row.id);
      }

      return next;
    });

  const confirm = async () => {
    const ids = [...selected.keys()];

    if (ids.length === 0) return;

    if (ids.length > room) {
      toast.error(
        `A rota comporta mais ${room} parada${room === 1 ? "" : "s"}: desmarque algumas.`,
      );
      return;
    }

    setIsAdding(true);

    let version = route.plan_version;
    let added = 0;

    try {
      for (const batch of chunk(ids)) {
        const answer = await trackWrite(async (adopt) => {
          const result = await addRouteStops(
            businessId,
            route.id,
            batch,
            version,
          );

          if (result.success) adopt(result.data?.planVersion);

          return result;
        });

        if (isStaleActionResult(answer)) return;

        if (!answer.success || !answer.data) {
          if (isPlanConflict(answer.code)) {
            onOpenChange(false);
            await onConflict(answer.message);
            return;
          }

          // Somebody routed one of these first: say where, keep the rest.
          toast.error(answer.message, {
            description:
              added > 0
                ? `${added} entrega${added === 1 ? "" : "s"} já tinha${added === 1 ? "" : "m"} entrado.`
                : undefined,
          });

          if (added > 0) await onAdded();
          await query.refetch();
          return;
        }

        version = answer.data.planVersion;
        added += answer.data.added + answer.data.alreadyOnRoute.length;
      }

      toast.success(
        added === 1
          ? `1 entrega adicionada à Rota ${route.code}.`
          : `${added} entregas adicionadas à Rota ${route.code}.`,
        {
          description:
            route.status === "RELEASED"
              ? "O motorista recebe a rota atualizada."
              : undefined,
        },
      );

      setSelected(new Map());
      onOpenChange(false);
      await onAdded();
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="space-y-1 border-b p-4 text-left">
          <SheetTitle>Adicionar entregas à Rota {route.code}</SheetTitle>
          <SheetDescription>
            Só aparecem entregas pendentes que ainda não estão em nenhuma rota.
            Elas entram no fim da ordem.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 border-b p-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              placeholder="Código, NF, destinatário, cidade ou rua..."
              aria-label="Buscar entregas sem rota"
              className="pl-8"
              maxLength={120}
            />
          </div>

          <fieldset className="space-y-1">
            <legend className="text-xs font-medium text-muted-foreground">
              Data prevista
            </legend>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  [
                    "route-day",
                    `Dia da rota (${formatDateOnly(route.scheduled_date, { fallback: "—" })}) ou sem data`,
                  ],
                  ["any", "Qualquer data"],
                  ["range", "Intervalo"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={filters.dateMode === mode}
                  onClick={() =>
                    setFilters((current) => ({ ...current, dateMode: mode }))
                  }
                  className={`rounded-full border px-2.5 py-1 text-xs focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-ring ${
                    filters.dateMode === mode
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {filters.dateMode === "range" && (
              <div className="grid gap-2 pt-1 sm:grid-cols-2">
                <DatePickerField
                  label="De"
                  htmlfor="picker-range-from"
                  name="picker-range-from"
                  dateOnly
                  allowFutureDates
                  value={filters.rangeFrom}
                  onChange={(value) =>
                    setFilters((current) => ({ ...current, rangeFrom: value }))
                  }
                />
                <DatePickerField
                  label="Até"
                  htmlfor="picker-range-to"
                  name="picker-range-to"
                  dateOnly
                  allowFutureDates
                  value={filters.rangeTo}
                  onChange={(value) =>
                    setFilters((current) => ({ ...current, rangeTo: value }))
                  }
                />

                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <Checkbox
                    checked={filters.rangeIncludesUnscheduled}
                    onCheckedChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        rangeIncludesUnscheduled: value === true,
                      }))
                    }
                  />
                  Incluir as entregas sem data prevista
                </label>
              </div>
            )}
          </fieldset>

          <ChipGroup
            label="Embarcador"
            options={facets.shipper ?? []}
            selected={filters.shippers}
            onToggle={(value) =>
              setFilters((current) => ({
                ...current,
                shippers: toggleValue(current.shippers, value),
              }))
            }
          />

          <ChipGroup
            label="Tipo"
            options={facets.kind}
            selected={filters.kinds}
            format={(value) => KIND_LABEL[value] ?? value}
            onToggle={(value) =>
              setFilters((current) => ({
                ...current,
                kinds: toggleValue(current.kinds, value),
              }))
            }
          />

          <ChipGroup
            label="UF"
            options={facets.uf}
            selected={filters.ufs}
            onToggle={(value) =>
              setFilters((current) => ({
                ...current,
                ufs: toggleValue(current.ufs, value),
              }))
            }
          />

          <ChipGroup
            label="Cidade"
            options={facets.city}
            selected={filters.cities}
            onToggle={(value) =>
              setFilters((current) => ({
                ...current,
                cities: toggleValue(current.cities, value),
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={allOnScreenSelected}
              disabled={rows.length === 0}
              onCheckedChange={(value) => toggleAll(value === true)}
              aria-label="Selecionar todas as entregas carregadas"
            />
            Selecionar todas carregadas
          </label>

          <span className="text-muted-foreground" aria-live="polite">
            {first ? `${first.total} sem rota` : ""}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {query.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="h-4 w-4 animate-spin" aria-hidden />
              Carregando entregas sem rota...
            </p>
          ) : query.isError ? (
            <p className="text-sm text-destructive">
              {(query.error as Error).message ||
                "Não foi possível carregar as entregas sem rota."}
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma entrega sem rota com estes filtros.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((delivery) => {
                const checked = selected.has(delivery.id);
                const title = delivery.code
                  ? `${delivery.code} · ${delivery.recipient_name}`
                  : delivery.recipient_name;

                return (
                  <li key={delivery.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-2
                      ${checked ? "border-primary bg-primary/5" : ""}`}
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggle(delivery, value === true)
                        }
                        aria-label={`Selecionar ${title}`}
                      />

                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span
                          className="block truncate text-sm font-medium"
                          title={title}
                        >
                          {title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[delivery.street, delivery.address_number]
                            .filter(Boolean)
                            .join(", ")}{" "}
                          · {delivery.city}/{delivery.uf}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {KIND_LABEL[delivery.kind] ?? delivery.kind}
                          {delivery.scheduled_date &&
                            ` · previsão ${formatDateOnly(delivery.scheduled_date, { fallback: "" })}`}
                          {delivery.shipper && ` · ${delivery.shipper.name}`}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {query.hasNextPage && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage && (
                <Loader className="mr-1 h-4 w-4 animate-spin" aria-hidden />
              )}
              Carregar mais
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm" aria-live="polite">
            {selected.size === 0
              ? "Nenhuma selecionada"
              : `${selected.size} selecionada${selected.size === 1 ? "" : "s"}`}
          </span>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isAdding}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>

            <Button
              className="w-full sm:w-auto"
              disabled={isAdding || selected.size === 0}
              onClick={() => void confirm()}
            >
              {isAdding && (
                <Loader className="mr-1 h-4 w-4 animate-spin" aria-hidden />
              )}
              Adicionar {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export { AddDeliveriesSheet };
