"use client";

import { Table } from "@tanstack/react-table";
import {
  Building2,
  Camera,
  CircleDot,
  Layers,
  FileSpreadsheet,
  ShieldAlert,
  Tags,
  Truck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { useSearch } from "@/lib/search-params";

import { DataTableFacetedFilter } from "@/app/(protected)/_components/shared/tanstack-table/data-table-faceted-filter";
import { DataTableToolbarEnd } from "@/app/(protected)/_components/shared/tanstack-table/data-table-toolbar-end";
import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import type { DeliveryTab } from "../lib/tabs";
import {
  DELIVERY_KIND_FILTER_LABELS,
  DELIVERY_STATUS_FILTER_LABELS,
  type DeliveryListSearchMeta,
} from "../deliveries/server-table";
import {
  DeliveriesPeriodFilter,
  DeliveriesPeriodSearchHint,
} from "./period-filter";
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
   * The days the deliveries listing covered, and whether an exact search
   * made the API ignore them (`searchMeta.period`).
   */
  periodMeta?: DeliveryListSearchMeta["period"];
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
  shippers: "Nome, CNPJ, e-mail ou ID...",
  "occurrence-types": "Nome, descrição ou ID...",
  "status-change-reasons": "Nome, descrição ou ID...",

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
  periodMeta,
  catalogFacets,
  table,
  error,
  isLoading,
  setIsLoading,
}: DeliveriesTableToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

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
          // From 200px up to 270px: the line breaks on the 200px basis and the
          // box takes back its 270px from what is left. A fixed 270px left the
          // period 24px of room at 1440px with the sidebar collapsed, and
          // Linux's text metrics (CI) used them up: the period wrapped.
          wrapperClassName="w-full sm:w-auto
          sm:flex-[1_1_200px] sm:min-w-[200px] sm:max-w-[270px]"
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
              {
                // Entrega, Ordem de serviço or Coleta: a closed set, no
                // counts from the API.
                columnId: "kind",
                title: "Tipo",
                icon: Tags,
                options: facetOptions(undefined, DELIVERY_KIND_FILTER_LABELS),
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

      {/* The period frames every number of the list (meeting of
          14/10/2026), and sits on the filters' line at the right, beside
          Visualizar, wrapping with it as one group. Never disabled by a
          failed read: a 30-day or a 92-day range is the likeliest cause of
          one, and a shorter period is the way out. */}
      <DataTableToolbarEnd table={table} error={error}>
        {activeTab === "deliveries" && (
          <DeliveriesPeriodFilter periodMeta={periodMeta} />
        )}
      </DataTableToolbarEnd>

      {activeTab === "deliveries" && (
        <DeliveriesPeriodSearchHint periodMeta={periodMeta} />
      )}
    </div>
  );
}
