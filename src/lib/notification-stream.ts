import { relayUrl } from "@/lib/api-relay-paths";
import { parseNDJSON } from "@/lib/parse-nd-json";

interface NotificationStreamRequest {
  limit: number;
  includeRead?: boolean;
  cursor?: string;
  signal?: AbortSignal;
}

/**
 * One page of `/notification/stream`, straight from the browser.
 *
 * Shared by the notifications page and the bell's provider. It lived inside
 * the page's hook, and the provider could not import it from there: the hook
 * imports the provider's context, so the two would import each other.
 *
 * Raw items: the dates are left as the API sent them, for each caller to
 * format the way it displays them.
 */
async function fetchNotificationStream({
  limit,
  includeRead = true,
  cursor,
  signal,
}: NotificationStreamRequest): Promise<{ data: any[]; meta: any }> {
  const params = new URLSearchParams();

  params.append("limit", String(limit));
  params.append("includeRead", String(includeRead));

  if (cursor) {
    params.append("cursor", cursor);
  }

  const response = await fetch(relayUrl("/notification/stream", params), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip",
    },
    signal,
  });

  if (!response.ok) {
    const errorClone = response.clone();
    const errorData = await errorClone.json();

    throw new Error(
      errorData.message ||
        `Erro HTTP: ${response.status} - ${response.statusText}`,
    );
  }

  return parseNDJSON(response);
}

export { fetchNotificationStream };
export type { NotificationStreamRequest };
