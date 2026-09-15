"use client";

import { useState } from "react";

import { Table } from "@tanstack/react-table";
import {
  Building2,
  Camera,
  CircleDot,
  FileSpreadsheet,
  MapPin,
  ShieldAlert,
  TriangleAlert,
  Truck,
  UserPlus,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useSearch } from "@/lib/search-params";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import type { DeliveryListItem } from "@/actions/delivery/get-delivery";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";
import { AssignDeliveriesDialog } from "../deliveries/assign-dialog";

import { DataTableFacetedFilter } from "@/app/(protected)/_components/shared/tanstack-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";

import type { DeliveryTab } from "../lib/tabs";

interface DeliveriesTableToolbarProps<TData> {
  activeTab: DeliveryTab;
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

interface FilterDescriptor {
  key: string;
  title: string;
  dynamicOptionIcon?: React.ComponentType<{ className?: string }>;
}

/**
 * Filters are per tab because each table answers different questions: an
 * operator hunts deliveries by status and destination, but a registry by
 * whether the entry is still in use.
 */
const FILTERS_BY_TAB: Record<DeliveryTab, FilterDescriptor[]> = {
  deliveries: [
    { key: "status", title: "Status", dynamicOptionIcon: CircleDot },
    { key: "shipperName", title: "Embarcador", dynamicOptionIcon: Building2 },
    { key: "destination", title: "Destino", dynamicOptionIcon: MapPin },
    { key: "driverName", title: "Motorista", dynamicOptionIcon: Truck },
  ],
  occurrences: [
    { key: "blocking", title: "Gravidade", dynamicOptionIcon: ShieldAlert },
    { key: "typeName", title: "Tipo", dynamicOptionIcon: TriangleAlert },
    {
      key: "deliveryStatus",
      title: "Status da entrega",
      dynamicOptionIcon: CircleDot,
    },
  ],
  monitoring: [],
  // The chat panel carries its own search — it never mounts this toolbar.
  chat: [],
  shippers: [{ key: "is_active", title: "Status", dynamicOptionIcon: CircleDot }],
  "occurrence-types": [
    { key: "is_active", title: "Status", dynamicOptionIcon: CircleDot },
    {
      key: "blocks_delivery",
      title: "Impeditiva",
      dynamicOptionIcon: ShieldAlert,
    },
    { key: "requires_photo", title: "Foto", dynamicOptionIcon: Camera },
  ],
  "status-change-reasons": [
    { key: "is_active", title: "Status", dynamicOptionIcon: CircleDot },
  ],
  imports: [
    { key: "status", title: "Status", dynamicOptionIcon: CircleDot },
    { key: "source", title: "Origem", dynamicOptionIcon: FileSpreadsheet },
  ],
};

const SEARCH_PLACEHOLDER: Record<DeliveryTab, string> = {
  deliveries: "Destinatário, pedido, NF-e, cidade, motorista ou CNH...",
  occurrences: "Destinatário ou tipo de ocorrência...",
  monitoring: "",
  chat: "",
  shippers: "Nome, CNPJ ou e-mail...",
  "occurrence-types": "Nome ou descrição...",
  "status-change-reasons": "Nome ou descrição...",

  // Empty hides the box: the listing endpoint takes no search term, and a
  // field that types into nothing is worse than no field.
  imports: "",
};

export function DeliveriesTableToolbar<TData>({
  activeTab,
  table,
  error,
  isLoading,
  setIsLoading,
}: DeliveriesTableToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  const businessId = useDeliveriesBusinessId();
  const [isAssignOpen, setIsAssignOpen] = useState<boolean>(false);

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;

  // Batch assignment reads the checked rows straight from the table
  // instance the DataTable injects; only the deliveries tab has the
  // selection column.
  const selectedDeliveries =
    activeTab === "deliveries" && table
      ? table
          .getSelectedRowModel()
          .rows.map((row) => row.original as DeliveryListItem)
      : [];

  const pendingSelection = selectedDeliveries.filter(
    (delivery) => delivery.status === "PENDING",
  );

  // The API would refuse a mixed batch anyway; the button explains before
  // the request instead of after it.
  const hasBlockedSelection =
    selectedDeliveries.length > pendingSelection.length;

  const isFiltered = (table?.getState().columnFilters.length ?? 0) > 0;

  const handleSearchWithLoading = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsLoading?.(true);
    handleSearch(event);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      {SEARCH_PLACEHOLDER[activeTab] !== "" && (
        <SearchInputWithLoading
          data-tutorial="deliveries-search"
          placeholder={SEARCH_PLACEHOLDER[activeTab]}
          defaultValue={searchParams.get("search") || ""}
          onChange={handleSearchWithLoading}
          disabled={error}
          isLoading={isPending || isLoading}
          wrapperClassName="w-full sm:w-auto
          sm:min-w-[270px] sm:max-w-[270px]"
        />
      )}

      <div
        className="flex flex-wrap items-center gap-2"
        data-tutorial="deliveries-filters"
      >
        {FILTERS_BY_TAB[activeTab].map(({ key, title, dynamicOptionIcon }) => {
          const column = table?.getColumn(key);
          if (!column) return null;

          return (
            <DataTableFacetedFilter
              key={key}
              column={column}
              title={title}
              dynamicOptionIcon={dynamicOptionIcon}
            />
          );
        })}
      </div>

      {isFiltered && (
        <Button
          variant="ghost"
          onClick={() => table?.resetColumnFilters()}
          className="h-8 px-2 lg:px-3 flex items-center gap-1"
        >
          Resetar
          <X className="h-4 w-4" />
        </Button>
      )}

      {!error && table && (
        <div className="w-full sm:w-auto sm:ml-auto">
          <DataTableViewOptions table={table} />
        </div>
      )}

      {/* Selection turns into a floating action pill over the table —
      Gmail-style bulk mode. It never disturbs the toolbar layout, and
      z-40 keeps it under the dialogs (z-50). */}
      {selectedDeliveries.length > 0 && (
        <div
          data-tutorial="deliveries-assign"
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2
          flex items-center gap-3 rounded-full border bg-background
          px-4 py-2 shadow-lg animate-in fade-in slide-in-from-bottom-2"
        >
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {selectedDeliveries.length} selecionada
            {selectedDeliveries.length > 1 ? "s" : ""}
          </span>

          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    size="sm"
                    className="h-8 flex items-center gap-1"
                    disabled={!canWrite || hasBlockedSelection}
                    onClick={() => setIsAssignOpen(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                    Atribuir motorista
                  </Button>
                </span>
              </TooltipTrigger>
              {(!canWrite || hasBlockedSelection) && (
                <TooltipContent className="max-w-xs">
                  <p>
                    {!canWrite
                      ? permissionsRequired.tooltipMessage
                      : "Só entregas pendentes podem ser atribuídas. " +
                        "Desmarque as que já saíram de Pendente."}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 flex items-center gap-1"
            onClick={() => table?.resetRowSelection()}
            aria-label="Limpar seleção"
          >
            Limpar
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {businessId && (
        <AssignDeliveriesDialog
          businessId={businessId}
          deliveries={pendingSelection}
          isOpen={isAssignOpen}
          onClose={() => setIsAssignOpen(false)}
          onAssigned={() => table?.resetRowSelection()}
        />
      )}
    </div>
  );
}
