"use client";

import { useState } from "react";

import { Table } from "@tanstack/react-table";
import {
  Building2,
  Camera,
  CircleDot,
  Layers,
  FileSpreadsheet,
  Route as RouteIcon,
  ShieldAlert,
  Truck,
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
import { AddToRouteDialog } from "@/features/routes/add-to-route-dialog";
import { addToRouteBlocker } from "@/features/routes/lib/add-to-route";

import { DataTableFacetedFilter } from "@/app/(protected)/_components/shared/tanstack-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import type { DeliveryTab } from "../lib/tabs";
import {
  DELIVERY_STATUS_FILTER_LABELS,
  type DeliveryListSearchMeta,
} from "../deliveries/server-table";
import {
  ACTIVE_LABELS,
  IMPORT_STATUS_LABELS,
  YES_NO_LABELS,
  type CatalogSearchMeta,
} from "../lib/catalog-tables";
import { CATEGORY_FILTER_LABELS } from "../occurrence-types/category-display";
import { IMPORT_SOURCE_LABEL } from "../imports/lib/status";

interface DeliveriesTableToolbarProps<TData> {
  activeTab: DeliveryTab;
  /**
   * The deliveries listing answered on the server (decision 8.8): its
   * filters' options and counts, from the API's `searchMeta.facets`. Absent,
   * the tab falls back to filtering the loaded page.
   */
  serverFacets?: DeliveryListSearchMeta["facets"];
  /**
   * A catalog tab answered on the server (decision 8.8): its filters' counts,
   * from `searchMeta.facets`. Absent, the tab filters the loaded page.
   */
  catalogFacets?: CatalogSearchMeta["facets"];
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
  // Answered on the server (DataTableServerFilters below, decision 8.8).
  deliveries: [],
  // The occurrences tab has its own toolbar (occurrences/toolbar.tsx).
  occurrences: [],
  monitoring: [],
  // The chat panel carries its own search — it never mounts this toolbar.
  chat: [],
  shippers: [
    { key: "is_active", title: "Status", dynamicOptionIcon: CircleDot },
  ],
  "occurrence-types": [
    { key: "category", title: "Categoria", dynamicOptionIcon: Layers },
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
  "message-templates": [],
  "proof-audits": [],
};

const SEARCH_PLACEHOLDER: Record<DeliveryTab, string> = {
  deliveries: "ID, destinatário, pedido, NF-e, cidade, motorista ou CNH...",
  occurrences: "",
  monitoring: "",
  chat: "",
  shippers: "Nome, CNPJ ou e-mail...",
  "occurrence-types": "Nome ou descrição...",
  "status-change-reasons": "Nome ou descrição...",

  // Empty hides the box: the listing endpoint takes no search term, and a
  // field that types into nothing is worse than no field.
  imports: "",
  "message-templates": "",
  "proof-audits": "",
};

/** The server filters of each catalog tab, from its facet counts. */
function catalogFilters(
  activeTab: DeliveryTab,
  facets: NonNullable<CatalogSearchMeta["facets"]>,
) {
  const status = {
    columnId: "is_active",
    title: "Status",
    icon: CircleDot,
    options: facetOptions(facets.status, ACTIVE_LABELS),
  };

  if (activeTab === "shippers" || activeTab === "status-change-reasons") {
    return [status];
  }

  if (activeTab === "occurrence-types") {
    return [
      {
        // Decision 14.3: Entrega / Não entrega / Pausa.
        columnId: "category",
        title: "Categoria",
        icon: Layers,
        options: facetOptions(facets.category, CATEGORY_FILTER_LABELS),
      },
      status,
      {
        columnId: "blocks_delivery",
        title: "Impeditiva",
        icon: ShieldAlert,
        options: facetOptions(facets.blocking, YES_NO_LABELS),
      },
      {
        columnId: "requires_photo",
        title: "Foto",
        icon: Camera,
        options: facetOptions(facets.photo, YES_NO_LABELS),
      },
    ];
  }

  if (activeTab === "imports") {
    return [
      {
        columnId: "status",
        title: "Status",
        icon: CircleDot,
        options: facetOptions(facets.status, IMPORT_STATUS_LABELS),
      },
      {
        columnId: "source",
        title: "Origem",
        icon: FileSpreadsheet,
        options: facetOptions(facets.source, IMPORT_SOURCE_LABEL),
      },
    ];
  }

  return [];
}

export function DeliveriesTableToolbar<TData>({
  activeTab,
  serverFacets,
  catalogFacets,
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

  // "Adicionar à rota" reads the checked rows straight from the table
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
  const selectionBlocker = addToRouteBlocker(selectedDeliveries);

  // On the server the filters bring their own "Resetar" (and live in the URL).
  const catalogServerFiltered = catalogFacets !== undefined;

  const serverFiltered =
    (activeTab === "deliveries" && serverFacets !== undefined) ||
    catalogServerFiltered;

  const isFiltered =
    !serverFiltered && (table?.getState().columnFilters.length ?? 0) > 0;

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
        {catalogServerFiltered && (
          <DataTableServerFilters
            table={table}
            filters={catalogFilters(activeTab, catalogFacets ?? {})}
          />
        )}

        {serverFiltered && !catalogServerFiltered && (
          <DataTableServerFilters
            table={table}
            filters={[
              {
                columnId: "status",
                title: "Status",
                icon: CircleDot,
                options: facetOptions(
                  serverFacets?.status,
                  DELIVERY_STATUS_FILTER_LABELS,
                ),
              },
              {
                columnId: "shipperName",
                title: "Embarcador",
                icon: Building2,
                // Names come from the server, scoped to the company.
                options: facetOptions(serverFacets?.shipperId),
              },
              {
                columnId: "driverName",
                title: "Motorista",
                icon: Truck,
                options: facetOptions(serverFacets?.driverId),
              },
            ]}
          />
        )}

        {!serverFiltered &&
          FILTERS_BY_TAB[activeTab].map(({ key, title, dynamicOptionIcon }) => {
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
                    disabled={!canWrite || selectionBlocker !== null}
                    onClick={() => setIsAssignOpen(true)}
                  >
                    <RouteIcon className="h-4 w-4" />
                    Adicionar à rota
                  </Button>
                </span>
              </TooltipTrigger>
              {(!canWrite || selectionBlocker) && (
                <TooltipContent className="max-w-xs">
                  <p>
                    {!canWrite
                      ? permissionsRequired.tooltipMessage
                      : selectionBlocker}
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

      {/* The route is the unit of assignment (decision 14.7): the
      selection joins a route, never a driver directly. */}
      {businessId && isAssignOpen && (
        <AddToRouteDialog
          businessId={businessId}
          deliveries={pendingSelection}
          isOpen={isAssignOpen}
          onClose={() => setIsAssignOpen(false)}
          onAdded={() => table?.resetRowSelection()}
        />
      )}
    </div>
  );
}
