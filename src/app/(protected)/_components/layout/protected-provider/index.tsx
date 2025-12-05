import { redirect } from "next/navigation";
import { getCookies } from "@/actions/cookies";

import { ProtectedLayout } from "@/app/(protected)/_components/layout";
import { ProtectedCommandBar } from "../protected-command-bar-provider";

import { UserRole, UserLoggedProps } from "../../dto";
import { SyncNotificationsProvider } from "./sync-notifications-wrapper";

import { parseJwt } from "@/lib/decode-jwt";

const ProtectedProvider = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  // Decode JWT to get role and driverId (for fallback when there's an error)
  const decodedJwt = tokenAccess ? parseJwt(tokenAccess) : null;
  const jwtRole = decodedJwt?.role || "user";

  const jwtDriverId = decodedJwt?.driverId || null;

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

  let response: Response | undefined;
  let notificationCount = 0;

  let serverNotificationIds: string[] = [];

  // Tries to run fetch and catches network errors
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
      if (response.status === 401) {
        redirect("/login");
      }

      userResponseError = true;
    } else {
      const data: UserLoggedProps = await response.json();

      if (data?.user) {
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

        // A single call to fetch notifications and calculate count
        try {
          const notificationResponse = await fetch(
            `${process.env.HTTP_REQUEST}/notification/list?limit=50&includeRead=true`,
            {
              headers: {
                Authorization: `Bearer ${tokenAccess}`,
                "Content-Type": "application/json",
              },
              credentials: "include",
              next: { tags: ["update-notification"] },
            },
          );

          if (notificationResponse.ok) {
            const notificationData = await notificationResponse.json();

            // ✅ Calculate count of unread messages in the frontend
            notificationCount =
              notificationData.data?.filter(
                (notification: any) => !notification.read,
              ).length || 0;

            // ✅ Extract IDs for synchronization
            serverNotificationIds =
              notificationData.data?.map(
                (notification: any) => notification.id,
              ) || [];
          } else {
            notificationResponseError = true;
          }
        } catch (error) {
          notificationResponseError = true;
        }
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
      <SyncNotificationsProvider serverNotificationIds={serverNotificationIds}>
        <ProtectedLayout
          userLogged={userLogged}
          error={userResponseError}
          notificationCount={notificationCount}
          notificationError={notificationResponseError}
        >
          {children}
        </ProtectedLayout>
      </SyncNotificationsProvider>
    </ProtectedCommandBar>
  );
};

export { ProtectedProvider };
