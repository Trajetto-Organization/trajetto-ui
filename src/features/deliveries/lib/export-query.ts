/**
 * The query of the deliveries and occurrences exports (decisions 5.8 and
 * DLV-EXP-1).
 *
 * The file is what the screen shows: the same search, the same facets, and on
 * /admin the company chosen in the selector — without it the API cannot tell
 * which company a MASTER means and answered 400 BUSINESS_NOT_IDENTIFIED.
 * No directive: the server actions and the client page actions import it.
 */

/** The facet params each export accepts, as the list API names them. */
const DELIVERY_EXPORT_FILTERS = ["status", "shipperId", "driverId"] as const;

const OCCURRENCE_EXPORT_FILTERS = [
  "severity",
  "occurrenceTypeId",
  "deliveryStatus",
] as const;

type ExportFilters = Partial<Record<string, string>> & { businessId?: string };

function buildExportParams(
  search: string | undefined,
  format: string | undefined,
  filters: ExportFilters,
  allowed: readonly string[],
): URLSearchParams {
  const params = new URLSearchParams();

  if (search) params.append("search", search);
  if (format) params.append("format", format);

  if (filters.businessId) params.append("businessId", filters.businessId);

  for (const name of allowed) {
    const value = filters[name];

    if (typeof value === "string" && value) params.append(name, value);
  }

  return params;
}

/**
 * The API's own sentence for a refused export, not its raw JSON body: the
 * toast used to read `400 - {"code":"BUSINESS_NOT_IDENTIFIED",…}`.
 */
function exportErrorMessage(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: unknown };

    if (typeof parsed.message === "string" && parsed.message) {
      return `Erro ao gerar relatório: ${parsed.message}`;
    }
  } catch {
    // Not JSON: fall through to the status.
  }

  return `Erro ao gerar relatório (código ${status}). Tente novamente.`;
}

export {
  DELIVERY_EXPORT_FILTERS,
  OCCURRENCE_EXPORT_FILTERS,
  buildExportParams,
  exportErrorMessage,
  type ExportFilters,
};
