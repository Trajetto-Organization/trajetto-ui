"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface ClientDiagnosticError {
  kind: "upload" | "api" | "network" | "unknown";
  status?: number;
  host?: string;
  message: string;
  count: number;
}

interface ReportClientDiagnosticsProps {
  errors: ClientDiagnosticError[];
}

/**
 * Tells the API about a failure only the browser saw (OBS-12): a PUT the
 * bucket refused, or one that never got an answer. The bytes go from the
 * browser straight to storage, so neither this server nor the API would ever
 * know otherwise.
 *
 * Runs on the server because the access token lives in an httpOnly cookie.
 * Best effort through and through: no session, an API without the endpoint,
 * a network error — all end quietly, since the caller already has an error
 * of its own to show.
 */
const handleReportClientDiagnostics = async ({
  errors,
}: ReportClientDiagnosticsProps): Promise<void> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess || errors.length === 0) return;

  try {
    await apiFetch(`${process.env.HTTP_REQUEST}/diagnostics/client`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform: "web",
        errors: errors.slice(0, 10).map((error) => ({
          ...error,
          message: error.message.slice(0, 200),
        })),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    logActionError("diagnostics/report-client-diagnostics", error);
  }
};

export { handleReportClientDiagnostics };
