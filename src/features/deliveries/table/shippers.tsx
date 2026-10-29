"use client";

import type { ShipperData } from "@/actions/shipper/list-shipper";

import { buildShipperColumns } from "../shippers/table-columns";

import { CatalogTable, type SectionTableProps } from "./section-table";

/** Embarcadores: its own chunk, loaded when the tab renders (index.tsx). */
const ShippersTable = (props: SectionTableProps): JSX.Element => (
  <CatalogTable<ShipperData>
    tab="shippers"
    columns={buildShipperColumns()}
    {...props}
  />
);

export { ShippersTable };
