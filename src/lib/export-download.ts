/**
 * An export, as the browser asks for it: the relay URL of an API path on the
 * relay's list, with its query. Built in the page
 * (src/lib/export-requests.ts), with the table's search, facets and company
 * (decision 5.8).
 */
interface ExportRequest {
  /** `/api/relay/delivery/export-delivery?…`, from `relayUrl`. */
  url: string;

  /** The file's name when the API sends no Content-Disposition. */
  fallbackFilename: string;

  /** What to say when the API refuses without a sentence of its own. */
  refusalFallback: string;
}

type ExportDownload =
  | {
      ok: true;
      filename: string;
      size: number;
      /** X-Total-Records, when the API sends it. */
      totalRecords: number | null;
    }
  | { ok: false; message: string; aborted?: boolean };

/**
 * The file name from a Content-Disposition, `filename*` (RFC 5987, UTF-8)
 * first, then `filename`. Null when there is none to read.
 */
function filenameFromDisposition(value: string | null): string | null {
  if (!value) return null;

  const extended = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(value);

  if (extended) {
    try {
      return decodeURIComponent(extended[2].trim().replace(/^"|"$/g, ""));
    } catch {
      // Malformed escape: fall through to the plain parameter.
    }
  }

  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(value);
  const name = (plain?.[2] ?? plain?.[1] ?? "").trim();

  return name || null;
}

function retryAfterSeconds(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);

  const at = Date.parse(value);

  return Number.isNaN(at)
    ? null
    : Math.max(1, Math.ceil((at - Date.now()) / 1000));
}

/**
 * The sentence for a refused export: the API's own (it speaks pt-BR, and it
 * says EXPORT_BUSY or "não existem registros" better than we could), with
 * the wait from Retry-After when it is busy.
 */
async function refusalMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;

  const own =
    typeof body?.message === "string" && body.message.trim()
      ? body.message.trim()
      : null;

  if (response.status === 429) {
    const wait = retryAfterSeconds(response.headers.get("retry-after"));
    const base = own ?? "Há exportações demais em andamento agora.";

    if (wait) return `${base} Tente de novo em ${wait} s.`;

    return own ?? `${base} Tente de novo em instantes.`;
  }

  if (response.status === 401) {
    return own ?? "Sua sessão expirou. Entre de novo para exportar.";
  }

  return own ?? fallback;
}

/** Hands a Blob to the browser as a download, then lets the memory go. */
function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.style.display = "none";
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Not at once: a browser may still be reading the URL when click()
  // returns, and revoking it then cancels the download.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Downloads an export straight from the API, through the same-origin relay.
 *
 * It used to go through a Server Action that read the whole file into the
 * Next server's memory, base64-encoded it and returned it in the action's
 * response, which the page then decoded byte by byte: ~4.5x the file in a
 * 512 MB heap, so ten exports of 17 MB at once took the web container down,
 * one past ~400 MB could never work, and closing the tab did not stop the
 * API. The relay streams the body (and drops the API request when the page
 * goes away), so the server holds a chunk at a time and the browser builds
 * the file.
 */
async function downloadExport(
  request: ExportRequest,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ExportDownload> {
  let response: Response;

  try {
    response = await fetch(request.url, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
  } catch {
    if (signal?.aborted) {
      return { ok: false, message: "Exportação cancelada.", aborted: true };
    }

    return {
      ok: false,
      message: "Não foi possível falar com o servidor. Tente novamente.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      message: await refusalMessage(response, request.refusalFallback),
    };
  }

  let blob: Blob;

  try {
    blob = await response.blob();
  } catch {
    if (signal?.aborted) {
      return { ok: false, message: "Exportação cancelada.", aborted: true };
    }

    return {
      ok: false,
      message: "A transferência do arquivo foi interrompida. Tente novamente.",
    };
  }

  const filename =
    filenameFromDisposition(response.headers.get("content-disposition")) ??
    request.fallbackFilename;

  saveBlob(blob, filename);

  const total = Number(response.headers.get("x-total-records"));

  return {
    ok: true,
    filename,
    size: blob.size,
    totalRecords: Number.isFinite(total) && total > 0 ? total : null,
  };
}

export { downloadExport, filenameFromDisposition, saveBlob };
export type { ExportDownload, ExportRequest };
