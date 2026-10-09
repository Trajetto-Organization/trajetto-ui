/**
 * What an import dialog does once the API answers (DLV-IMP-3, DLV-IMP-UI-1).
 * No directive and no React: both dialogs share it and a test reads it.
 */

/**
 * The server caches an upload touches, on EVERY 200 — not only when something
 * was imported: the Importações row exists either way (a file of duplicates
 * is still an upload with a report), and the spreadsheet builds routes.
 */
function importRevalidationTags(createdShippers: number): string[] {
  return [
    "update-import",
    "update-delivery",
    "update-route",
    // New shippers from NF-e issuers: the Embarcadores tab and its picker.
    ...(createdShippers > 0 ? ["update-shipper"] : []),
  ];
}

/**
 * A success toast only when something became a delivery; an upload where
 * every file was a duplicate or an error warns instead of celebrating.
 */
function importToastKind(imported: number): "success" | "warning" {
  return imported > 0 ? "success" : "warning";
}

/**
 * Whether the dialog may close: ESC, the X and Cancelar wait while an upload
 * is in flight, or the report the operator is waiting for is lost.
 */
function canCloseImportDialog(isImporting: boolean): boolean {
  return !isImporting;
}

export { canCloseImportDialog, importRevalidationTags, importToastKind };
