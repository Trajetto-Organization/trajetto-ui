import { cache } from "react";
import { headers } from "next/headers";

import type { UserLoggedProps } from "@/app/(protected)/_components/shared/common.types";

import { readAccessError, type AccessError } from "./access-error";
import { apiForwardingHeaders } from "./api-forwarding";
import {
  readablePermissionKeys,
  type RouteAccessContext,
} from "./route-access";

interface SessionAccess extends RouteAccessContext {
  /**
   * The session's own company (null for the MASTER). The client panels of a
   * /dashboard page read it: sent empty, their requests carried
   * `?businessId=` and the API refused the malformed id.
   */
  businessId: string | null;
}

/** How long a server render waits for the API before calling it unreachable. */
const SERVER_READ_TIMEOUT_MS = 10_000;

type SessionUser = UserLoggedProps["user"];

/**
 * What `/user/me` said, read once and parsed: a Response body can only be
 * read once, and several components of the same render ask.
 *
 * - `ok`: the session's user;
 * - `refused`: the API answered no (or 4xx/5xx/429) — the status and body
 *   say whether that is a verdict (security-checks.ts decides);
 * - `unreachable`: no answer, a timeout, or a 200 without a user in it (a
 *   proxy page, a truncated body). Never a verdict on the session.
 */
type SessionUserAnswer =
  | { kind: "ok"; user: SessionUser }
  | { kind: "refused"; status: number; body: unknown }
  | { kind: "unreachable" };

async function fetchSessionUser(token: string): Promise<SessionUserAnswer> {
  let response: Response;

  try {
    response = await fetch(`${process.env.HTTP_REQUEST}/user/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // A token the middleware could not renew is limited per address:
        // say which browser this is for, not this server.
        ...apiForwardingHeaders(requestHeaders()),
      },
      cache: "no-store",
      // Every tag a page that shows the user used to put on its own read.
      next: {
        tags: [
          "update-username",
          "update-2fa",
          "whatsapp-settings",
          "email-notifications",
          "activity-notifications",
        ],
      },
      signal: AbortSignal.timeout(SERVER_READ_TIMEOUT_MS),
    });
  } catch {
    return { kind: "unreachable" };
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);

    return { kind: "refused", status: response.status, body };
  }

  const data = (await response.json().catch(() => null)) as Partial<
    Pick<UserLoggedProps, "user">
  > | null;

  return data?.user ? { kind: "ok", user: data.user } : { kind: "unreachable" };
}

/** The incoming request's headers, or none outside a request (tests). */
function requestHeaders(): Headers {
  try {
    return new Headers(headers());
  } catch {
    return new Headers();
  }
}

/**
 * `/user/me` for this request, asked once however many components need it.
 *
 * The protected layout's gate reads it on every navigation; the dashboard,
 * the profile and the Entregas tabs read it again. They used to be separate
 * round trips in series (the fetch dedupe Next does in a render is off for a
 * request with a `signal`, and their options differed anyway). React's
 * `cache` memoizes per server request, so the page's read reuses the
 * layout's answer. Outside a React server render (a Server Action, a test)
 * it simply calls through.
 */
const readSessionUser: (token: string) => Promise<SessionUserAnswer> =
  typeof cache === "function" ? cache(fetchSessionUser) : fetchSessionUser;

/**
 * The session's access, read on the server for what a page renders inside
 * itself (the tabs of Entregas). The page gate already ran in the protected
 * layout with the same answer, which this reuses (`readSessionUser`).
 */
async function fetchSessionAccess(
  token: string,
): Promise<SessionAccess | null> {
  const answer = await readSessionUser(token);

  if (answer.kind !== "ok") return null;

  const user = answer.user;
  if (!user?.role) return null;

  return {
    role: user.role,
    permissions: readablePermissionKeys(user.profileAccess?.permissions),
    enabledModules: user.enabledModules ?? null,
    isDriver: user.role === "BUSINESS_USER" && Boolean(user.driverId),
    businessId: user.businessId ?? null,
  };
}

/**
 * Why the API refuses this company, asked of one of the module's own routes
 * (decision 4.3), for the MASTER looking at it from /admin.
 *
 * The module gate answers, and it tells apart a company switched off
 * (TENANT_INACTIVE) and one that never hired the module (MODULE_NOT_ENABLED).
 * The plan endpoint this used to read cannot: it lists the modules of a
 * switched-off company as if it could be operated, and the page then offered
 * "Gerenciar módulos" for it. `null` when nothing was refused, or the
 * question could not be asked: the page's own requests then answer, with the
 * same codes.
 */
async function fetchCompanyRefusal(
  token: string,
  probePath: string,
  businessId: string,
): Promise<AccessError | null> {
  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}${probePath}?businessId=${encodeURIComponent(businessId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(SERVER_READ_TIMEOUT_MS),
      },
    );

    return await readAccessError(response);
  } catch {
    return null;
  }
}

export {
  SERVER_READ_TIMEOUT_MS,
  fetchCompanyRefusal,
  fetchSessionAccess,
  readSessionUser,
};
export type { SessionAccess, SessionUser, SessionUserAnswer };
