import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getCookies } from "@/actions/cookies";

import { ProtectedLayout } from "@/app/(protected)/_components/layout";
import { ProtectedCommandBar } from "../protected-command-bar-provider";

import { parseJwt } from "@/lib/decode-jwt";
import { readSessionUser } from "@/lib/session-access";

import { handleUserRefusal, validateUserAccess } from "./security-checks";
import { fetchNotifications } from "./fetch-notifications";
import { StreamedNotifications } from "./streamed-notifications";

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

  // Started before `/user/me`: it needs only the token, so the two API round
  // trips overlap. It is NOT awaited here any more — the bell's list streams
  // in behind the page (StreamedNotifications) instead of holding every
  // protected page until the 50 notifications arrive. It never rejects
  // (errors become `error: true`), so an early return or a redirect below
  // leaves nothing unhandled.
  const notificationsRequest = fetchNotifications(tokenAccess);

  // Memoized for the request: the page's own read of the session reuses this
  // answer instead of asking the API again.
  const session = await readSessionUser(tokenAccess);

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
  // A read that times out (session-access.ts bounds it) is the second kind,
  // and so is a 200 with no user in it (a proxy page, a truncated body).
  if (session.kind === "unreachable") {
    return <ConnectionRetry alwaysVisible />;
  }

  if (session.kind === "refused") {
    // The access token expired and the middleware could not renew it because
    // the API was busy or down — so this 401 is the expired token talking,
    // not a verdict on the session. Same answer as the API not responding:
    // keep the session and let the next navigation renew it.
    if (
      session.status === 401 &&
      headersList.get(SESSION_RENEWAL_HEADER) === RENEWAL_PENDING
    ) {
      return <ConnectionRetry alwaysVisible />;
    }

    // Every verdict (401, any 403 by its code, 404) redirects from inside —
    // `redirect` throws `NEXT_REDIRECT`, so it must not sit in a try/catch.
    // Returning means the API did not judge the session (5xx, 429): the API
    // failing or busy rather than answering.
    handleUserRefusal(session.status, session.body);
    return <ConnectionRetry alwaysVisible />;
  }

  const user = session.user;

  validateUserAccess({
    user,
    jwtRole,
    jwtDriverId,
    pathname,
    enabledModules: user.enabledModules ?? [],
  });

  const userLogged = {
    id: user.id,
    businessId: user.businessId as string,
    email: user.email,
    name: user.name,
    avatar: user.avatar as string,
    role: user.role,
    two_factor_enabled: user.two_factor_enabled as boolean,
    permissions: user.profileAccess?.permissions as [],
    driverId: user.driverId || null,
    profileAccess: user.profileAccess || null,
    enabledModules: user.enabledModules ?? [],
  };

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
      {/* Its own boundary, with no fallback: the bell fills in when the list
          arrives, and the page around it never waits for it. */}
      <Suspense fallback={null}>
        <StreamedNotifications request={notificationsRequest} />
      </Suspense>

      <ProtectedLayout userLogged={userLogged}>{children}</ProtectedLayout>
    </ProtectedCommandBar>
  );
};

export { ProtectedProvider };
