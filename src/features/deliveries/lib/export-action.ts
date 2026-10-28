import type { ExportFormat } from "@/app/(protected)/_components/shared/custom/export-button/export-button.types";

import { serverTableQuery } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";
import type { ExportRequest } from "@/lib/export-download";
import {
  exportDeliveryRequest,
  exportOccurrenceRequest,
} from "@/lib/export-requests";

import { deliveriesListQuery } from "../deliveries/server-table";
import { OCCURRENCE_TABLE } from "../occurrences/server-table";

type ParamSource = Parameters<typeof deliveriesListQuery>[0];

/**
 * The export of a tab, bound to what the screen shows (decision 5.8): the
 * table's facets from the URL and the company the page is about. On /admin
 * the MASTER has no company of their own, so without `businessId` the API
 * answered 400 BUSINESS_NOT_IDENTIFIED (DLV-EXP-1). The file is downloaded
 * through the relay (src/lib/export-download.ts).
 */
function exportRequestFor(
  tab: "deliveries" | "occurrences" | string,
  context: { businessId: string | null | undefined; searchParams: ParamSource },
): (search?: string, format?: ExportFormat) => ExportRequest {
  const company = context.businessId ? { businessId: context.businessId } : {};

  if (tab === "occurrences") {
    return (search, format) =>
      exportOccurrenceRequest(search, format, {
        ...serverTableQuery(context.searchParams, OCCURRENCE_TABLE),
        ...company,
      });
  }

  return (search, format) =>
    exportDeliveryRequest(search, format, {
      ...deliveriesListQuery(context.searchParams),
      ...company,
    });
}

export { exportRequestFor };
