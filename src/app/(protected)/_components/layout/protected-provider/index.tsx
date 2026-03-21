import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getCookies } from "@/actions/cookies";

import { ProtectedLayout } from "@/app/(protected)/_components/layout";
import { ProtectedCommandBar } from "../protected-command-bar-provider";

import type { UserRole, UserLoggedProps } from "../../shared/common.types";
import { SyncNotificationsProvider } from "./sync-notifications-wrapper";

import { parseJwt } from "@/lib/decode-jwt";

import { handleUserResponseError, validateUserAccess } from "./security-checks";
import { fetchNotifications } from "./fetch-notifications";

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

  let userLogged = {
    id: "",
    businessId: "",
    email: "",
    avatar: "",
    name: "Usuário",
    role: jwtRole as UserRole,
    two_factor_enabled: false,
    permissions: [],
    driverId: jwtDriverId as string | null,
    profileAccess: null as { permissions?: any[] } | null,
  };

  let userResponseError = false;
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
  } catch (error) {
    userResponseError = true;
  }

  if (response) {
    if (!response.ok) {
      await handleUserResponseError(response);
      userResponseError = true;
    } else {
      const data: UserLoggedProps = await response.json();

      if (data?.user) {
        validateUserAccess({
          user: data.user,
          jwtRole,
          jwtDriverId,
          pathname,
        });

        userLogged = {
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
        };

        const notificationResult = await fetchNotifications(tokenAccess);

        serverNotifications = notificationResult.notifications;
        serverNotificationIds = notificationResult.notificationIds;

        notificationResponseError = notificationResult.error;
      }
    }
  }

  return (
    <ProtectedCommandBar
      user={{
        role: userLogged.role,
        permissions: userLogged.permissions,
        driverId: userLogged.driverId,
        profileAccess: userLogged.profileAccess,
      }}
    >
      <SyncNotificationsProvider
        serverNotifications={serverNotifications}
        serverNotificationIds={serverNotificationIds}
      >
        <ProtectedLayout
          userLogged={userLogged}
          error={userResponseError}
          notificationError={notificationResponseError}
        >
          {children}
        </ProtectedLayout>
      </SyncNotificationsProvider>
    </ProtectedCommandBar>
  );
};

export { ProtectedProvider };
