"use client";

import dynamic from "next/dynamic";

import type { DeliveryTab } from "../lib/tabs";
import type { OccurrenceRow } from "../lib/panels";
import type { OccurrenceFeedSearchMeta } from "../occurrences/server-table";
import { DeliveriesTableSkeleton } from "../skeleton";

import type { SectionTableProps } from "./section-table";

/**
 * While a tab's table code is on its way: the table's own toolbar, rows and
 * pagination, in DataTable's frame (`my-9 space-y-4`). The server renders
 * the open tab's table (ssr stays on), so a full load and its hydration
 * paint the real one; this shows only on a client-side change to a tab
 * whose chunk has not been loaded yet.
 */
const TableLoading = (): JSX.Element => (
  <div data-tutorial="loading" aria-busy="true" className="my-9 space-y-4">
    <DeliveriesTableSkeleton />
  </div>
);

/*
  One chunk per tab. A single module with every tab's columns put the row
  menus and dialogs of all of them — the occurrence types' form builder, the
  occurrences' photo inspector and authorization queue, the deliveries'
  route dialogs — in the first load of Entregas AND of the Torre, whichever
  tab was open. Now only the open tab's table is downloaded.
*/
const DeliveryListTable = dynamic(
  () => import("./deliveries").then((module) => module.DeliveryListTable),
  { loading: TableLoading },
);

const ShippersTable = dynamic(
  () => import("./shippers").then((module) => module.ShippersTable),
  { loading: TableLoading },
);

const ImportsTable = dynamic(
  () => import("./imports").then((module) => module.ImportsTable),
  { loading: TableLoading },
);

const OccurrenceTypesTable = dynamic(
  () =>
    import("./occurrence-types").then((module) => module.OccurrenceTypesTable),
  { loading: TableLoading },
);

const StatusChangeReasonsTable = dynamic(
  () =>
    import("./status-change-reasons").then(
      (module) => module.StatusChangeReasonsTable,
    ),
  { loading: TableLoading },
);

// The Torre's Ocorrências (moved from Entregas on 14/10/2026).
const OccurrencesTable = dynamic(
  () =>
    import("../occurrences/table").then((module) => module.OccurrencesTable),
  { loading: TableLoading },
);

interface DeliveriesTableProps extends SectionTableProps {
  activeTab: DeliveryTab;
}

/**
 * Rows come from the server; each tab picks its table. What the viewer may
 * do is decided inside the actions cell, which reads the session directly so
 * a permission change redraws the row without rebuilding the table.
 *
 * `searchMeta` and `catalogServerMode` go with the sort and facet params the
 * page forwarded (decision 8.8): the deliveries and the occurrences are
 * always answered on the server; the catalog tabs when the page says so.
 */
const DeliveriesTable = ({
  activeTab,
  ...props
}: DeliveriesTableProps): JSX.Element => {
  switch (activeTab) {
    case "shippers":
      return <ShippersTable {...props} />;
    case "imports":
      return <ImportsTable {...props} />;
    case "occurrence-types":
      return <OccurrenceTypesTable {...props} />;
    case "status-change-reasons":
      return <StatusChangeReasonsTable {...props} />;
    case "occurrences":
      return (
        <OccurrencesTable
          data={props.data as OccurrenceRow[]}
          meta={props.meta}
          responseError={props.responseError}
          searchMeta={props.searchMeta as OccurrenceFeedSearchMeta | undefined}
        />
      );
    default:
      return <DeliveryListTable {...props} />;
  }
};

export { DeliveriesTable };
