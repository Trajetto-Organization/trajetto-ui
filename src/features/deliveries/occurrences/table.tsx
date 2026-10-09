"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import type { OccurrenceRow } from "../lib/panels";

import { buildOccurrenceColumns } from "./table-columns";
import {
  OCCURRENCE_TABLE,
  type OccurrenceFeedSearchMeta,
} from "./server-table";
import { OccurrencesToolbar } from "./toolbar";
import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";
import { OccurrenceAuthorizationQueueSlot } from "../occurrence-authorizations/queue";

interface OccurrencesTableProps {
  data: OccurrenceRow[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  /** The NDJSON meta line's `searchMeta`: cards and filter options. */
  searchMeta?: OccurrenceFeedSearchMeta;
}

/**
 * The occurrence feed on the server-side table contract: order, filters and
 * pager all answered by the API for the whole company. The page forwards the
 * URL's sort and filter params with `occurrencesListQuery`.
 */
const OccurrencesTable = ({
  data,
  meta,
  responseError,
  searchMeta,
}: OccurrencesTableProps): JSX.Element => {
  const columns = useMemo(buildOccurrenceColumns, []);
  const businessId = useDeliveriesBusinessId();
  const router = useRouter();

  return (
    <div className="space-y-4">
      {/* Decision 6.3: what waits for the tower, above the history. */}
      {/* The table below is server-rendered: its "Aguardando torre" badges
          follow the queue by re-rendering the page when the queue moves. */}
      <OccurrenceAuthorizationQueueSlot
        businessId={businessId}
        onQueueChanged={() => router.refresh()}
      />

      <DataTable
        data={data}
        meta={meta}
        columns={columns}
        responseError={responseError}
        server={OCCURRENCE_TABLE}
        toolbar={<OccurrencesToolbar facets={searchMeta?.facets} />}
      />
    </div>
  );
};

export { OccurrencesTable };
