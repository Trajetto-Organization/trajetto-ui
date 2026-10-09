"use client";

import { useMemo, useState } from "react";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Loader,
  MapPin,
  MapPinOff,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RowActionItem,
  RowActions,
  RowActionSeparator,
} from "@/components/shared/custom/row-actions";
import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import type { RouteStop } from "@/actions/route/get-route";

import { currentOnTheWayStopId, routeStopMeta } from "../lib/status";
import { isStopDraggable } from "../lib/stop-order";
import { hasPoint } from "../lib/route-map-points";
import { stopListAccessibility } from "../lib/stop-announcements";

import { MoveToPositionDialog } from "./move-to-position-dialog";

interface RouteStopsBoardProps {
  stops: RouteStop[];

  /** The order on screen (local while unsaved). */
  orderedIds: string[];
  dirty: boolean;

  /** The route can be planned AND the user can write. */
  editable: boolean;

  /** Why the list is read-only, when it is. */
  blockedReason: string | null;

  /** Why "Adicionar entregas" is disabled (also the 200 ceiling). */
  addBlockedReason: string | null;

  /** A released route: removing tells the driver. */
  released: boolean;

  isSaving: boolean;
  isRemoving: boolean;

  highlightedStopId: string | null;
  onHighlight: (stopId: string | null) => void;

  onMove: (from: number, to: number) => void;
  onSave: () => void;
  onDiscard: () => void;
  onRemove: (stopIds: string[]) => Promise<boolean>;
  onOpenPicker: () => void;
  onPin: (deliveryId: string, label: string) => void;
}

const KIND_LABEL: Record<string, string> = {
  DELIVERY: "Entrega",
  PICKUP: "Coleta",
};

function stopTitle(stop: RouteStop): string {
  const delivery = stop.delivery;

  return delivery.code
    ? `${delivery.code} · ${delivery.recipient_name}`
    : delivery.recipient_name;
}

function shortAddress(stop: RouteStop): string {
  const { street, address_number, neighborhood, city, uf } = stop.delivery;

  return [
    [street, address_number].filter(Boolean).join(", "),
    neighborhood,
    `${city}/${uf}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

interface SortableStopRowProps {
  stop: RouteStop;
  index: number;
  total: number;
  editable: boolean;
  selected: boolean;
  highlighted: boolean;
  onTheWayId: string | null;
  onToggle: (checked: boolean) => void;
  onMove: (from: number, to: number) => void;
  onMoveTo: () => void;
  onRemove: () => void;
  onPin: () => void;
  onHighlight: (stopId: string | null) => void;
  blockedReason: string | null;
}

const SortableStopRow = ({
  stop,
  index,
  total,
  editable,
  selected,
  highlighted,
  onTheWayId,
  onToggle,
  onMove,
  onMoveTo,
  onRemove,
  onPin,
  onHighlight,
  blockedReason,
}: SortableStopRowProps): JSX.Element => {
  const draggable = isStopDraggable(stop.status, editable);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id, disabled: !draggable });

  const meta = routeStopMeta(stop, onTheWayId);
  const located = hasPoint(stop.delivery);
  const title = stopTitle(stop);

  return (
    <li
      ref={setNodeRef}
      data-stop-id={stop.id}
      style={{
        transform: transform
          ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
          : undefined,
        transition,
      }}
      onMouseEnter={() => onHighlight(stop.id)}
      onMouseLeave={() => onHighlight(null)}
      className={`flex min-w-0 items-start gap-2 rounded-md border bg-background p-2
      ${isDragging ? "relative z-10 shadow-lg" : ""}
      ${highlighted ? "ring-2 ring-primary/60" : ""}`}
    >
      <span
        className="mt-1 w-7 shrink-0 text-center text-sm font-semibold tabular-nums"
        aria-hidden
      >
        {index + 1}
      </span>

      {draggable ? (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Arrastar ${title}, posição ${index + 1} de ${total}`}
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-1
          text-muted-foreground hover:bg-muted focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
      ) : (
        <span className="w-6 shrink-0" aria-hidden />
      )}

      {editable && stop.status === "PENDING" && (
        <Checkbox
          className="mt-1.5"
          checked={selected}
          onCheckedChange={(value) => onToggle(value === true)}
          aria-label={`Selecionar ${title}`}
        />
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-medium" title={title}>
          {title}
        </p>

        <p
          className="truncate text-xs text-muted-foreground"
          title={shortAddress(stop)}
        >
          {shortAddress(stop)}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={meta.badgeClassName}>
            {meta.label}
          </Badge>

          <span className="text-xs text-muted-foreground">
            {KIND_LABEL[stop.delivery.kind] ?? stop.delivery.kind}
          </span>

          <span
            className={`flex items-center gap-1 text-xs ${
              located
                ? "text-muted-foreground"
                : "text-amber-700 dark:text-amber-400"
            }`}
          >
            {located ? (
              <MapPin className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <MapPinOff className="h-3.5 w-3.5" aria-hidden />
            )}
            {located ? "No mapa" : "Sem localização"}
          </span>
        </div>
      </div>

      {draggable && (
        <div className="flex shrink-0 flex-col">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            aria-label={`Subir ${title}`}
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
            aria-label={`Descer ${title}`}
          >
            <ArrowDown className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}

      <RowActions entity={title}>
        <RowActionItem
          label="Mover para a posição…"
          blockedReason={
            draggable
              ? null
              : (blockedReason ?? "Esta parada já foi trabalhada.")
          }
          onSelect={onMoveTo}
        />

        <RowActionItem
          label="Fixar no mapa"
          blockedReason={editable ? null : blockedReason}
          onSelect={onPin}
        />

        <RowActionSeparator />

        <RowActionItem
          label="Remover da rota"
          destructive
          blockedReason={
            editable && stop.status === "PENDING"
              ? null
              : (blockedReason ?? "Esta parada já foi trabalhada.")
          }
          onSelect={onRemove}
        />
      </RowActions>
    </li>
  );
};

/**
 * The deliveries of the route in the order the driver will follow (decision
 * 14.7, §5.3): dragged with the mouse or the keyboard (dnd-kit, announced in
 * Portuguese), or moved with ↑/↓ and "Mover para a posição…" for long lists.
 * The order is saved explicitly, as a complete list; removing is a checked
 * selection plus a confirmation that says whether the driver will be told.
 */
const RouteStopsBoard = ({
  stops,
  orderedIds,
  dirty,
  editable,
  blockedReason,
  addBlockedReason,
  released,
  isSaving,
  isRemoving,
  highlightedStopId,
  onHighlight,
  onMove,
  onSave,
  onDiscard,
  onRemove,
  onOpenPicker,
  onPin,
}: RouteStopsBoardProps): JSX.Element => {
  const byId = useMemo(
    () => new Map(stops.map((stop) => [stop.id, stop])),
    [stops],
  );

  const ordered = useMemo(
    () =>
      orderedIds
        .map((id) => byId.get(id))
        .filter((stop): stop is RouteStop => !!stop),
    [orderedIds, byId],
  );

  const onTheWayId = currentOnTheWayStopId(stops);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<string[] | null>(null);
  const [movingStop, setMovingStop] = useState<{
    index: number;
    title: string;
  } | null>(null);

  // A selection only ever names stops still on the list.
  const selectedIds = [...selected].filter(
    (id) => byId.get(id)?.status === "PENDING",
  );

  const sensors = useSensors(
    // Four pixels before a press becomes a drag, so a click stays a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const accessibility = useMemo(
    () =>
      stopListAccessibility(
        ordered.map((stop) => ({ id: stop.id, title: stopTitle(stop) })),
      ),
    [ordered],
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const from = orderedIds.indexOf(String(active.id));
    const to = orderedIds.indexOf(String(over.id));

    if (from >= 0 && to >= 0) onMove(from, to);
  };

  const confirmRemoval = async () => {
    if (!confirming) return;

    const done = await onRemove(confirming);

    if (done) {
      setSelected(new Set());
      setConfirming(null);
    }
  };

  return (
    <section
      aria-label="Entregas da rota"
      className="min-w-0 space-y-3 rounded-lg border p-4"
      data-tutorial="route-stops"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold">
          Entregas da rota{" "}
          <span className="font-normal text-muted-foreground">
            ({ordered.length})
          </span>
        </h3>

        <div className="flex flex-col gap-2 sm:flex-row">
          {selectedIds.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-destructive sm:w-auto"
              disabled={isRemoving}
              onClick={() => setConfirming(selectedIds)}
            >
              Remover da rota ({selectedIds.length})
            </Button>
          )}

          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  tabIndex={addBlockedReason ? 0 : -1}
                  className="w-full sm:w-auto"
                >
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={Boolean(addBlockedReason)}
                    onClick={onOpenPicker}
                    data-tutorial="route-add-deliveries"
                  >
                    <Plus className="mr-1 h-4 w-4" aria-hidden />
                    Adicionar entregas
                  </Button>
                </span>
              </TooltipTrigger>
              {addBlockedReason && (
                <TooltipContent className="max-w-xs">
                  <p>{addBlockedReason}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {!editable && blockedReason && (
        <p className="text-xs text-muted-foreground">{blockedReason}</p>
      )}

      {ordered.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma entrega nesta rota ainda. Use “Adicionar entregas” para
          escolher as entregas sem rota.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={accessibility}
        >
          <SortableContext
            items={orderedIds}
            strategy={verticalListSortingStrategy}
          >
            <ol className="max-h-[70vh] space-y-2 overflow-y-auto overscroll-contain pr-1">
              {ordered.map((stop, index) => (
                <SortableStopRow
                  key={stop.id}
                  stop={stop}
                  index={index}
                  total={ordered.length}
                  editable={editable}
                  selected={selected.has(stop.id)}
                  highlighted={highlightedStopId === stop.id}
                  onTheWayId={onTheWayId}
                  blockedReason={blockedReason}
                  onHighlight={onHighlight}
                  onToggle={(checked) =>
                    setSelected((current) => {
                      const next = new Set(current);

                      if (checked) next.add(stop.id);
                      else next.delete(stop.id);

                      return next;
                    })
                  }
                  onMove={onMove}
                  onMoveTo={() =>
                    setMovingStop({ index, title: stopTitle(stop) })
                  }
                  onRemove={() => setConfirming([stop.id])}
                  onPin={() => onPin(stop.delivery.id, stopTitle(stop))}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {dirty && (
        <div
          className="sticky bottom-0 flex flex-col gap-2 rounded-md border bg-background
          p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm">A nova ordem ainda não foi salva.</p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isSaving}
              onClick={onDiscard}
            >
              Descartar
            </Button>

            <Button
              size="sm"
              className="w-full sm:w-auto"
              disabled={isSaving}
              onClick={onSave}
            >
              {isSaving && (
                <Loader className="mr-1 h-4 w-4 animate-spin" aria-hidden />
              )}
              Salvar ordem
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={
          confirming && confirming.length > 1
            ? `Remover ${confirming.length} entregas da rota?`
            : "Remover a entrega da rota?"
        }
        description={
          released
            ? "Elas voltam para as entregas sem rota. O motorista será avisado de que a rota mudou."
            : "Elas voltam para as entregas sem rota e podem entrar em outra rota."
        }
        confirmLabel="Remover"
        destructive
        isPending={isRemoving}
        onConfirm={confirmRemoval}
      />

      {movingStop && (
        <MoveToPositionDialog
          open={movingStop !== null}
          title={movingStop.title}
          current={movingStop.index + 1}
          total={ordered.length}
          onOpenChange={(open) => !open && setMovingStop(null)}
          onConfirm={(position) => {
            onMove(movingStop.index, position - 1);
            setMovingStop(null);
          }}
        />
      )}
    </section>
  );
};

export { RouteStopsBoard };
