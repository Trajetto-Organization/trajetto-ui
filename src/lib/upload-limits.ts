/**
 * Mirrors the limits the API enforces (`uploadConfig` in trajetto-api).
 *
 * Checked in the browser only so a user hears about an oversized batch before
 * uploading it. Storage refuses a PUT that does not match its signature and the
 * API re-checks every real byte count, so these are a courtesy, never the
 * guarantee.
 */
const MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024;
const MAX_CHECKLIST_TOTAL_BYTES = 5 * 1024 * 1024;

export { MAX_UPLOAD_FILE_BYTES, MAX_CHECKLIST_TOTAL_BYTES };
