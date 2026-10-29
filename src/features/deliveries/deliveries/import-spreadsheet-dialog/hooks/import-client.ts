import type {
  ImportReport,
  ImportSpreadsheetResult,
} from "@/actions/import/import-spreadsheet";
import { relayUrl } from "@/lib/api-relay-paths";

/**
 * Sending the spreadsheet and following the import, from the browser.
 *
 * It was a Server Action taking the file base64 as an argument, and Next
 * 14's 1 MB action body cap refused any sheet past ~750 KB while the dialog
 * promises 6 MB. The relay's route handler has no such cap and streams the
 * same JSON the API takes ({ filename, content (base64), shipperId }).
 */

/** What the dialog shows when an import ends: the API's own shape. */
type SpreadsheetImportAnswer =
  | { ok: true; message: string; result: ImportSpreadsheetResult }
  | {
      ok: false;
      message: string;
      /** The upload went in and is still processing: the list follows it. */
      stillRunning?: boolean;
      aborted?: boolean;
    };

/** How far an import the API runs in the background has got. */
interface ImportProgress {
  /** Rows decided so far, when the API says. */
  processedRows: number | null;
}

const POLL_FIRST_MS = 1_000;
const POLL_MAX_MS = 3_000;

/** Past this the dialog stops waiting; the Importações tab keeps following. */
const POLL_CEILING_MS = 15 * 60 * 1000;

/** Consecutive failed reads before the dialog gives up on following. */
const POLL_MAX_FAILURES = 5;

const STILL_RUNNING =
  "A importação continua em andamento. Acompanhe o resultado na aba Importações.";

/** The API's own summary sentence (import-delivery-spreadsheet-controller). */
function summaryMessage(result: {
  imported: number;
  duplicated: number;
  invalid: number;
}): string {
  return (
    `${result.imported} entrega(s) importada(s), ` +
    `${result.duplicated} duplicada(s), ${result.invalid} com erro.`
  );
}

const EMPTY_REPORT: ImportReport = {
  imported: 0,
  duplicated: 0,
  invalid: 0,
  unknownHeaders: [],
  rows: [],
  routes: [],
};

function messageOf(body: unknown, fallback: string): string {
  const message = (body as { message?: unknown } | null)?.message;

  return typeof message === "string" && message.trim() ? message : fallback;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(resolve, ms);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/** The import's id in a 202, whichever of the usual names the API uses. */
function acceptedImportId(body: unknown): string | null {
  const root = (body ?? {}) as Record<string, unknown>;
  const data = (root.data ?? {}) as Record<string, unknown>;

  for (const value of [data.id, data.importId, root.id, root.importId]) {
    if (typeof value === "string" && value) return value;
  }

  return null;
}

type ImportRecord = Partial<ImportSpreadsheetResult> & {
  status?: string;
  message?: string;
  error?: string;
};

/** A finished import read back from get-import, in the dialog's shape. */
function resultOf(id: string, record: ImportRecord): ImportSpreadsheetResult {
  const report = { ...EMPTY_REPORT, ...(record.report ?? {}) };

  return {
    id,
    imported: record.imported ?? report.imported,
    duplicated: record.duplicated ?? report.duplicated,
    invalid: record.invalid ?? report.invalid,
    report,
  };
}

interface WaitOptions {
  signal?: AbortSignal;
  onProgress?: (progress: ImportProgress) => void;
  firstDelayMs?: number;
  maxDelayMs?: number;
  ceilingMs?: number;
}

/**
 * Follows an import the API accepted (202) until it leaves IN_PROGRESS:
 * GET /import/get-import/:importId/business/:businessId through the relay,
 * a little slower each time, up to POLL_CEILING_MS. A run that outlives the
 * wait, or reads that keep failing, end as `stillRunning`: the upload is in,
 * and the Importações tab shows how it ends.
 */
async function waitForImport(
  importId: string,
  businessId: string,
  {
    signal,
    onProgress,
    firstDelayMs = POLL_FIRST_MS,
    maxDelayMs = POLL_MAX_MS,
    ceilingMs = POLL_CEILING_MS,
  }: WaitOptions = {},
): Promise<SpreadsheetImportAnswer> {
  const url = relayUrl(
    `/import/get-import/${encodeURIComponent(importId)}/business/${encodeURIComponent(businessId)}`,
  );
  const startedAt = Date.now();

  let delay = firstDelayMs;
  let failures = 0;

  try {
    while (Date.now() - startedAt < ceilingMs) {
      await sleep(delay, signal);
      delay = Math.min(Math.round(delay * 1.5), maxDelayMs);

      let response: Response;

      try {
        response = await fetch(url, { cache: "no-store", signal });
      } catch (error) {
        if (signal?.aborted) throw error;

        failures += 1;
        if (failures >= POLL_MAX_FAILURES) break;

        continue;
      }

      const body = (await response.json().catch(() => null)) as {
        data?: ImportRecord;
        message?: string;
      } | null;

      if (!response.ok) {
        // A verdict on this read (not found, no permission): following it
        // further changes nothing. Busy or failing: try again.
        if (response.status < 500 && response.status !== 429) {
          return {
            ok: false,
            message: messageOf(body, STILL_RUNNING),
            stillRunning: true,
          };
        }

        failures += 1;
        if (failures >= POLL_MAX_FAILURES) break;

        continue;
      }

      failures = 0;

      const record = body?.data ?? {};

      if (!record.status || record.status === "IN_PROGRESS") {
        const rows = record.report?.rows?.length ?? 0;
        const counted =
          (record.imported ?? 0) +
          (record.duplicated ?? 0) +
          (record.invalid ?? 0);

        onProgress?.({ processedRows: rows || counted || null });

        continue;
      }

      if (record.status === "COMPLETED" || record.status === "REVERSED") {
        const result = resultOf(importId, record);

        return { ok: true, message: summaryMessage(result), result };
      }

      // Any other end (a failed run): the API's sentence when it has one.
      return {
        ok: false,
        message: messageOf(
          { message: record.message ?? record.error },
          "A importação não pôde ser concluída. Confira a aba Importações.",
        ),
      };
    }
  } catch {
    if (signal?.aborted) {
      return { ok: false, message: STILL_RUNNING, aborted: true };
    }
  }

  return { ok: false, message: STILL_RUNNING, stillRunning: true };
}

interface SubmitOptions {
  signal?: AbortSignal;
  /** The API took the file and runs it in the background (202). */
  onAccepted?: () => void;
  onProgress?: (progress: ImportProgress) => void;
  /** Polling cadence, for tests. */
  wait?: Omit<WaitOptions, "signal" | "onProgress">;
}

/**
 * Sends the spreadsheet through the relay and answers with its outcome.
 *
 * Both API behaviours, so the deploy order does not matter: the synchronous
 * 200 with the report, and the 202 of an import that runs in the background,
 * which is then followed until it ends (waitForImport).
 */
async function submitSpreadsheetImport(
  businessId: string,
  file: { filename: string; content: string },
  shipperId: string,
  options: SubmitOptions = {},
): Promise<SpreadsheetImportAnswer> {
  let response: Response;

  try {
    response = await fetch(
      relayUrl(`/import/import-spreadsheet/${encodeURIComponent(businessId)}`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...file, shipperId }),
        cache: "no-store",
        signal: options.signal,
      },
    );
  } catch {
    if (options.signal?.aborted) {
      return { ok: false, message: "Envio cancelado.", aborted: true };
    }

    return {
      ok: false,
      message:
        "Não foi possível enviar a planilha. Confira a aba Importações antes de enviar de novo.",
    };
  }

  const body = (await response.json().catch(() => null)) as {
    message?: string;
    data?: ImportSpreadsheetResult;
  } | null;

  if (response.status === 202) {
    const importId = acceptedImportId(body);

    if (!importId) {
      return { ok: false, message: STILL_RUNNING, stillRunning: true };
    }

    options.onAccepted?.();

    return waitForImport(importId, businessId, {
      ...options.wait,
      signal: options.signal,
      onProgress: options.onProgress,
    });
  }

  if (!response.ok || !body?.data) {
    return {
      ok: false,
      message: messageOf(body, "Houve um erro ao importar a planilha."),
    };
  }

  return {
    ok: true,
    message: messageOf(body, summaryMessage(body.data)),
    result: body.data,
  };
}

export {
  POLL_CEILING_MS,
  STILL_RUNNING,
  acceptedImportId,
  submitSpreadsheetImport,
  summaryMessage,
  waitForImport,
};
export type { ImportProgress, SpreadsheetImportAnswer };
