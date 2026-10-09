"use server";

import { getCookies } from "../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { parseJwt } from "@/lib/decode-jwt";
import { logActionError } from "@/lib/log-action-error";

/**
 * What the browser may learn about its own session, and nothing more.
 *
 * These are Server Actions — endpoints any script on the origin can call —
 * so neither returns the access token: one returns a one-use socket ticket,
 * the other only the claims the menus and the security check compare.
 */

type SocketTicketResult =
  | { ok: true; ticket: string }
  | { ok: false; status: number; code: string | null };

/**
 * A one-use ticket for the Socket.IO handshake (POST /user/socket-ticket).
 *
 * Minted with the session's token server to server; worth one connection of
 * this session for 30 s. `status` 401 means the session itself is over (the
 * socket then reloads the page so the middleware decides), anything else is
 * a transient refusal the socket retries.
 */
async function mintSocketTicket(): Promise<SocketTicketResult> {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess)
    return { ok: false, status: 401, code: "AUTH_TOKEN_MISSING" };

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/user/socket-ticket`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenAccess}` },
        cache: "no-store",
      },
    );

    const body: unknown = await response.json().catch(() => null);
    const record = (body && typeof body === "object" ? body : {}) as Record<
      string,
      unknown
    >;

    if (response.ok && typeof record.ticket === "string") {
      return { ok: true, ticket: record.ticket };
    }

    return {
      ok: false,
      status: response.status,
      code: typeof record.code === "string" ? record.code : null,
    };
  } catch (error) {
    logActionError("session/mintSocketTicket", error);

    // The API did not answer: a network failure, not a verdict.
    return { ok: false, status: 503, code: null };
  }
}

interface SessionClaims {
  userId: string | null;
  role: string | null;
  businessId: string | null;
  driverId: string | null;
}

/**
 * The claims of the session's access token, decoded on the server.
 *
 * Unverified, as they always were on the client: they only steer what the
 * page draws, and every read and write is authorized by the API. Null only
 * when there is no session cookie at all.
 */
async function readSessionClaims(): Promise<SessionClaims | null> {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return null;

  // A cookie that does not decode is a session with no readable claims, not
  // "no session": the security check reads that as a changed role and ends
  // it, as it did when the page decoded the token itself.
  const parsed: unknown = parseJwt(tokenAccess);
  const decoded = (
    parsed && typeof parsed === "object" ? parsed : {}
  ) as Record<string, unknown>;

  const text = (value: unknown) =>
    typeof value === "string" && value ? value : null;

  return {
    userId: text(decoded.sub),
    role: text(decoded.role),
    businessId: text(decoded.businessId),
    driverId: text(decoded.driverId),
  };
}

export { mintSocketTicket, readSessionClaims };
export type { SessionClaims, SocketTicketResult };
