"use client";

import dynamic from "next/dynamic";

/**
 * The dialogs behind Entregas' action bar, one chunk each.
 *
 * The bar mounts each one only while it is open, but its static imports put
 * all of them — the delivery form with its route and address fields, the
 * occurrence types' form builder, both importers — in the first load of
 * Entregas and of the Torre (whose Ocorrências share the bar), whichever tab
 * was open and whether or not anybody clicked. They now load on the first
 * click, like the delivery detail (deliveries/detail-dialog/lazy.tsx).
 */
const DeliveryFormDialog = dynamic(
  () =>
    import("../deliveries/form-dialog").then(
      (module) => module.DeliveryFormDialog,
    ),
  { ssr: false },
);

const ImportXmlDialog = dynamic(
  () =>
    import("../deliveries/import-xml-dialog").then(
      (module) => module.ImportXmlDialog,
    ),
  { ssr: false },
);

const ImportSpreadsheetDialog = dynamic(
  () =>
    import("../deliveries/import-spreadsheet-dialog").then(
      (module) => module.ImportSpreadsheetDialog,
    ),
  { ssr: false },
);

const ShipperFormDialog = dynamic(
  () =>
    import("../shippers/form-dialog").then(
      (module) => module.ShipperFormDialog,
    ),
  { ssr: false },
);

const OccurrenceTypeFormDialog = dynamic(
  () =>
    import("../occurrence-types/form-dialog").then(
      (module) => module.OccurrenceTypeFormDialog,
    ),
  { ssr: false },
);

const StatusChangeReasonFormDialog = dynamic(
  () =>
    import("../status-change-reasons/form-dialog").then(
      (module) => module.StatusChangeReasonFormDialog,
    ),
  { ssr: false },
);

export {
  DeliveryFormDialog,
  ImportSpreadsheetDialog,
  ImportXmlDialog,
  OccurrenceTypeFormDialog,
  ShipperFormDialog,
  StatusChangeReasonFormDialog,
};
