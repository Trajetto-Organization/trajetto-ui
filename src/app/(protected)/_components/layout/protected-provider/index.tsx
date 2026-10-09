import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getCookies } from "@/actions/cookies";

import { ProtectedLayout } from "@/app/(protected)/_components/layout";
import { ProtectedCommandBar } from "../protected-command-bar-provider";

import type { UserLoggedProps } from "../../shared/common.types";
import { SyncNotificationsProvider } from "./sync-notifications-wrapper";

import { parseJwt } from "@/lib/decode-jwt";

import { handleUserResponseError, validateUserAccess } from "./security-checks";
import { fetchNotifications } from "./fetch-notifications";

import { ConnectionRetry } from "@/components/shared/connection-lost-screen/connection-retry";
import { RENEWAL_PENDING, SESSION_RENEWAL_HEADER } from "@/lib/session-renewal";

const ProtectedProvider = async ({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  // Decode JWT to get role and driverId (for fallback when there's an error)
  const decodedJwt = tokenAccess ? parseJwt(tokenAccess) : null;
  const jwtRole = decodedJwt?.role || "user";

  const jwtDriverId = decodedJwt?.driverId || null;

  // Get pathname from middleware header (for page-level permission check)
  const headersList = headers();
  const pathname = headersList.get("x-pathname") || "";

  // No placeholder built from JWT claims any more. It existed so the layout
  // could still render when `/user/me` failed, which is the failing-open this
  // file no longer does — every path that would have used it now either logs
  // the user out or shows the connection screen.
  let notificationResponseError = false;

  let serverNotifications: {
    id: string;
    title: string;
    message: string;
    link?: string;
    type: string;
    read: boolean;
    created_at: string | Date;
  }[] = [];

  let serverNotificationIds: string[] = [];

  // Started before `/user/me` and awaited after the gate: it needs only the
  // token, so the two API round trips overlap instead of running in series.
  // It never rejects (errors become `error: true`), so an early return or a
  // redirect below leaves nothing unhandled.
  const notificationsRequest = fetchNotifications(tokenAccess);

  // Fetch user data
  let response: Response | undefined;

  try {
    response = await fetch(`${process.env.HTTP_REQUEST}/user/me`, {
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      next: {
        tags: ["update-username"],
      },
    });
  } catch {
    // Left undefined on purpose — the check below turns it into the connection
    // screen.
  }

  // This is the gate the whole protected area rests on: it runs on every
  // navigation with no cache. It used to fail open — a missing response or an
  // unmapped status fell through to rendering the layout from stale JWT
  // claims, leaving the user on a dashboard where nothing worked and nothing
  // said why.
  //
  // It now closes in two different ways, because the two failures mean
  // different things:
  //
  //   the API said no    → an authoritative negative. Log out, throw the
  //                        session away, send them to the login.
  //   the API said nothing → we know nothing. Keep the session, show the
  //                        connection screen, and keep asking.
  //
  // Collapsing the second into the first is what would log out every driver in
  // the field on an ordinary deploy, for no security gain: the API is the
  // enforcement point, so a stale dashboard grants nothing while it is down.
  if (!response) {
    return <ConnectionRetry alwaysVisible />;
  }

  // The access token expired and the middleware could not renew it because
  // the API was busy or down — so this 401 is the expired token talking, not
  // a verdict on the session. Same answer as the API not responding: keep the
  // session and let the next navigation renew it.
  if (
    response.status === 401 &&
    headersList.get(SESSION_RENEWAL_HEADER) === RENEWAL_PENDING
  ) {
    return <ConnectionRetry alwaysVisible />;
  }

  if (!response.ok) {
    // Every verdict (401, any 403 by its code, 404) redirects from inside —
    // `redirect` throws `NEXT_REDIRECT`, so it must not sit in a try/catch.
    // Returning means the API did not judge the session (5xx, 429): the API
    // failing or busy rather than answering.
    await handleUserResponseError(response);
    return <ConnectionRetry alwaysVisible />;
  }

  const data: UserLoggedProps = await response
    .json()
    .catch(() => ({}) as never);

  // A 200 with no user in it — a proxy error page, a truncated body. The API
  // did not really answer, so it is treated as not answering.
  if (!data?.user) {
    return <ConnectionRetry alwaysVisible />;
  }

  validateUserAccess({
    user: data.user,
    jwtRole,
    jwtDriverId,
    pathname,
    enabledModules: data.user.enabledModules ?? [],
  });

  const userLogged = {
    id: data.user.id,
    businessId: data.user.businessId as string,
    email: data.user.email,
    name: data.user.name,
    avatar: data.user.avatar as string,
    role: data.user.role,
    two_factor_enabled: data.user.two_factor_enabled as boolean,
    permissions: data.user.profileAccess?.permissions as [],
    driverId: data.user.driverId || null,
    profileAccess: data.user.profileAccess || null,
    enabledModules: data.user.enabledModules ?? [],
  };

  const notificationResult = await notificationsRequest;

  serverNotifications = notificationResult.notifications;
  serverNotificationIds = notificationResult.notificationIds;

  notificationResponseError = notificationResult.error;

  return (
    <ProtectedCommandBar
      user={{
        role: userLogged.role,
        permissions: userLogged.permissions,
        driverId: userLogged.driverId,
        profileAccess: userLogged.profileAccess,
        enabledModules: userLogged.enabledModules,
      }}
    >
      <SyncNotificationsProvider
        serverNotifications={serverNotifications}
        serverNotificationIds={serverNotificationIds}
      >
        <ProtectedLayout
          userLogged={userLogged}
          notificationError={notificationResponseError}
        >
          {children}
        </ProtectedLayout>
      </SyncNotificationsProvider>
    </ProtectedCommandBar>
  );
};

export { ProtectedProvider };
