import {
  DELIVERY_EXPORT_FILTERS,
  OCCURRENCE_EXPORT_FILTERS,
  buildExportParams,
  type ExportFilters,
} from "@/features/deliveries/lib/export-query";
import { relayUrl } from "@/lib/api-relay-paths";
import { readBusinessIdParam } from "@/lib/business-id-param";

import type { ExportRequest } from "@/lib/export-download";

/**
 * The nine exports as relay requests (src/lib/export-download.ts), each with
 * the screen's search, facets and company (decision 5.8). Each URL is spelled
 * `relayUrl("/…")`, which the promote's route gate
 * (scripts/check-api-routes.mjs) reads.
 *
 * The same queries the Server Actions in src/actions/<domain>/export-* built
 * on the server; only the names each export's API schema knows travel, so
 * nothing else from the address bar rides along. The API still validates
 * every one, and judges the permission (exporting is a write, decision 4.2).
 * The fallback names carry no date: the API names the file with the
 * company's day (decision 1.2), and a fallback dated by the server's UTC day
 * is tomorrow after 21:00 in São Paulo.
 */
type ExportFormat = "csv" | "excel";

const extension = (format: ExportFormat | undefined) =>
  format === "excel" ? "xlsx" : "csv";

/** search, format, then the allowed names that carry a value, in order. */
function queryOf(
  search: string | undefined,
  format: ExportFormat | undefined,
  values: Record<string, string | undefined>,
  allowed: readonly string[],
): URLSearchParams {
  const params = new URLSearchParams();

  if (search) params.append("search", search);
  if (format) params.append("format", format);

  for (const name of allowed) {
    const value = values[name];

    if (typeof value === "string" && value) params.append(name, value);
  }

  return params;
}

function exportDeliveryRequest(
  search?: string,
  format: ExportFormat = "csv",
  filters: ExportFilters = {},
): ExportRequest {
  const params = buildExportParams(
    search,
    format,
    filters,
    DELIVERY_EXPORT_FILTERS,
  );

  return {
    url: relayUrl("/delivery/export-delivery", params),
    fallbackFilename: `entregas.${extension(format)}`,
    refusalFallback: "Não foi possível exportar as entregas.",
  };
}

function exportOccurrenceRequest(
  search?: string,
  format: ExportFormat = "csv",
  filters: ExportFilters = {},
): ExportRequest {
  const params = buildExportParams(
    search,
    format,
    filters,
    OCCURRENCE_EXPORT_FILTERS,
  );

  return {
    url: relayUrl("/delivery/export-occurrence", params),
    fallbackFilename: `ocorrencias.${extension(format)}`,
    refusalFallback: "Não foi possível exportar as ocorrências.",
  };
}

const DRIVER_FILTERS = [
  "businessId",
  "sort",
  "order",
  "status",
  "contract_type",
  "cnh_category",
  "branchId",
] as const;

function exportDriverRequest(
  search?: string,
  format: ExportFormat = "csv",
  filters: Partial<Record<(typeof DRIVER_FILTERS)[number], string>> = {},
): ExportRequest {
  const params = queryOf(search, format, filters, DRIVER_FILTERS);

  return {
    url: relayUrl("/driver/export-driver", params),
    fallbackFilename: `relatorio-motoristas.${extension(format)}`,
    refusalFallback: "Não foi possível gerar o relatório de motoristas.",
  };
}

const FUEL_FILTERS = ["businessId", "branchId", "vehicleId", "fuelTypeId"];

/** The fuel facets are ids (one or a comma list): anything else is dropped. */
const UUID_LIST =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(,[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})*$/i;

function exportFuelRequest(
  search?: string,
  format: ExportFormat = "csv",
  filters: Record<string, string> = {},
): ExportRequest {
  const ids = Object.fromEntries(
    Object.entries(filters).filter(
      ([name, value]) =>
        FUEL_FILTERS.includes(name) &&
        typeof value === "string" &&
        UUID_LIST.test(value),
    ),
  );
  const params = queryOf(search, format, ids, FUEL_FILTERS);

  return {
    url: relayUrl("/fuel/export-fuel", params),
    fallbackFilename: `relatorio-abastecimentos.${extension(format)}`,
    refusalFallback: "Não foi possível gerar o relatório de abastecimentos.",
  };
}

interface ScopedExport {
  /** The company on screen; the MASTER must send it (decision 5.8). */
  businessId?: string;
  /** The screen's facet params, as in the URL. */
  filters?: Record<string, string>;
}

function scopedQuery(
  search: string | undefined,
  format: ExportFormat,
  scope: ScopedExport,
  allowed: readonly string[],
): URLSearchParams {
  return queryOf(
    search,
    format,
    { ...scope.filters, businessId: scope.businessId },
    ["businessId", ...allowed],
  );
}

function exportServiceOrderRequest(
  search?: string,
  format: ExportFormat = "csv",
  scope: ScopedExport = {},
): ExportRequest {
  const params = scopedQuery(search, format, scope, [
    "status",
    "maintenanceType",
    "branchId",
  ]);

  return {
    url: relayUrl("/service-order/export-service-order", params),
    fallbackFilename: `relatorio-ordens-de-servico.${extension(format)}`,
    refusalFallback: "Não foi possível gerar o relatório de ordens de serviço.",
  };
}

function exportVehicleRequest(
  search?: string,
  format: ExportFormat = "csv",
  scope: ScopedExport = {},
): ExportRequest {
  const params = scopedQuery(search, format, scope, ["status", "branchId"]);

  return {
    url: relayUrl("/vehicle/export-vehicle", params),
    fallbackFilename: `relatorio-veiculos.${extension(format)}`,
    refusalFallback: "Não foi possível gerar o relatório de veículos.",
  };
}

function exportVehicleChecklistRequest(
  search?: string,
  format: ExportFormat = "csv",
  scope: ScopedExport = {},
): ExportRequest {
  const params = scopedQuery(search, format, scope, [
    "overall_condition",
    "branchId",
    "vehicleId",
  ]);

  return {
    url: relayUrl("/vehicle-checklist/export-vehicle-checklist", params),
    fallbackFilename: `relatorio-checklists.${extension(format)}`,
    refusalFallback: "Não foi possível gerar o relatório de checklists.",
  };
}

interface CompanyExport {
  /** The MASTER's selected company; absent on /dashboard (the session's). */
  businessId?: string;
  search?: string;
  format?: ExportFormat;
  /** The list's own filter params. */
  filters?: Record<string, string>;
}

/** format first, then the company (a UUID or nothing), search and filters. */
function companyQuery(
  { businessId, search, format = "csv", filters = {} }: CompanyExport,
  allowed: readonly string[],
): URLSearchParams {
  const params = new URLSearchParams({ format });
  const company = readBusinessIdParam(businessId);

  if (company) params.set("businessId", company);
  if (search) params.set("search", search);

  for (const name of allowed) {
    if (filters[name]) params.set(name, filters[name]);
  }

  return params;
}

function exportAccountPayableRequest(request: CompanyExport): ExportRequest {
  const params = companyQuery(request, ["status", "category", "sort", "order"]);

  return {
    url: relayUrl("/account-payable/export-account-payable", params),
    fallbackFilename: `relatorio-contas-a-pagar.${extension(request.format)}`,
    refusalFallback: "Não foi possível gerar o relatório de contas a pagar.",
  };
}

function exportFineRequest(request: CompanyExport): ExportRequest {
  const params = companyQuery(request, [
    "status",
    "branchId",
    "trafficViolationCodeId",
  ]);

  return {
    url: relayUrl("/fines/export-fine", params),
    fallbackFilename: `relatorio-multas.${extension(request.format)}`,
    refusalFallback: "Não foi possível gerar o relatório de multas.",
  };
}

export {
  exportAccountPayableRequest,
  exportDeliveryRequest,
  exportDriverRequest,
  exportFineRequest,
  exportFuelRequest,
  exportOccurrenceRequest,
  exportServiceOrderRequest,
  exportVehicleChecklistRequest,
  exportVehicleRequest,
};
export type { ExportFormat };
