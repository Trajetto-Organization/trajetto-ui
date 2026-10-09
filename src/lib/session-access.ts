import type {
  PermissionKey,
  UserRole,
} from "@/app/(protected)/_components/shared/common.types";

import { readAccessError, type AccessError } from "./access-error";
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

/**
 * The session's access, read on the server for what a page renders inside
 * itself (the tabs of Entregas). The page gate already ran in the protected
 * layout with the same answer.
 *
 * Same URL and options as the layout's `/user/me`, so Next deduplicates the
 * two into one request within a render; were it not, it is one more read of
 * a route the API answers from the session it already loads.
 */
async function fetchSessionAccess(
  token: string,
): Promise<SessionAccess | null> {
  try {
    const response = await fetch(`${process.env.HTTP_REQUEST}/user/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      next: {
        tags: ["update-username"],
      },
    });

    if (!response.ok) return null;

    const body = (await response.json().catch(() => null)) as {
      user?: {
        role: UserRole;
        businessId?: string | null;
        driverId?: string | null;
        enabledModules?: string[];
        profileAccess?: {
          permissions?: Array<{
            permissionKey: PermissionKey;
            canRead?: boolean;
          }>;
        } | null;
      };
    } | null;

    const user = body?.user;
    if (!user?.role) return null;

    return {
      role: user.role,
      permissions: readablePermissionKeys(user.profileAccess?.permissions),
      enabledModules: user.enabledModules ?? null,
      isDriver: user.role === "BUSINESS_USER" && Boolean(user.driverId),
      businessId: user.businessId ?? null,
    };
  } catch {
    return null;
  }
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
      },
    );

    return await readAccessError(response);
  } catch {
    return null;
  }
}

export { fetchCompanyRefusal, fetchSessionAccess };
export type { SessionAccess };
