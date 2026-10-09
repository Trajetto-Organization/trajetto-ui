import { redirect } from "next/navigation";
import { Bell, Settings } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

import type {
  UserLoggedProps,
  UserRole,
} from "@/app/(protected)/_components/shared/common.types";

import { AvatarUpload } from "@/app/(protected)/_components/profile/account/avatar-upload";
import { UserNameForm } from "@/app/(protected)/_components/profile/account/user-name-form";

import { UserPasswordForm } from "@/app/(protected)/_components/profile/account/user-password-form";
import { UserTwoFactorAuthentication } from "@/app/(protected)/_components/profile/account/user-two-factor-authentication";
import { UserAppearance } from "@/app/(protected)/_components/profile/account/user-appearance";

import { WhatsAppNotifications } from "@/app/(protected)/_components/profile/notifications/whatsapp/whatsapp-notifications";
import { NotificationPreferences } from "@/app/(protected)/_components/profile/notifications/preferences";

import type { NotificationPreferenceRow } from "@/actions/notifications";

interface ProfileContentProps {
  token: string;
}

async function getProfileData(token: string) {
  let userLogged = {
    email: "",
    name: "Usuário",
    avatar: null as string | null,
    role: "user" as UserRole,
    two_factor_enabled: false,
    email_notifications_enabled: true,
    activity_notifications_enabled: true,
    driverId: null as string | null,
  };

  let userResponseError = false;
  let expired = false;

  try {
    const response = await fetch(`${process.env.HTTP_REQUEST}/user/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      next: {
        tags: [
          "update-username",
          "update-2fa",
          "whatsapp-settings",
          "email-notifications",
          "activity-notifications",
        ],
      },
    });

    if (!response.ok) {
      expired = response.status === 401;
      userResponseError = true;
    }

    const data: UserLoggedProps = await response.json();

    if (data?.user) {
      userLogged = {
        email: data.user.email,
        name: data.user.name,
        avatar: data.user.avatar || null,
        role: data.user.role,
        two_factor_enabled: data.user.two_factor_enabled as boolean,
        email_notifications_enabled:
          data.user.email_notifications_enabled ?? true,
        activity_notifications_enabled:
          data.user.activity_notifications_enabled ?? true,
        driverId: data.user.driverId || null,
      };
    }
  } catch (error) {
    userResponseError = true;
  }

  // Outside the try: `redirect` throws, and the catch above used to swallow
  // it, rendering the forms with an error instead of going to the login.
  if (expired) redirect("/login");

  return { userLogged, userResponseError };
}

async function getNotificationPreferences(
  token: string,
): Promise<NotificationPreferenceRow[] | null> {
  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/notification/preferences`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        next: { tags: ["notification-preferences"] },
      },
    );

    if (!response.ok) {
      return null;
    }

    const { preferences } = await response.json();
    return preferences;
  } catch (error) {
    return null;
  }
}

async function getWhatsAppSettings(token: string) {
  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/whatsapp/settings`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        next: { tags: ["whatsapp-settings"] },
      },
    );

    if (!response.ok) {
      return null;
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    return null;
  }
}

const ProfileContent = async ({
  token,
}: ProfileContentProps): Promise<JSX.Element> => {
  // One round trip instead of three in series: the settings and the
  // preferences need only the token. Every signed-in role sees the WhatsApp
  // card, so its read is not wasted; the fallback role drops it below.
  const [
    { userLogged, userResponseError },
    whatsappRead,
    notificationPreferences,
  ] = await Promise.all([
    getProfileData(token),
    getWhatsAppSettings(token),
    getNotificationPreferences(token),
  ]);

  const canSeeWhatsApp =
    userLogged.role === "BUSINESS_ADMIN" ||
    userLogged.role === "BUSINESS_USER" ||
    userLogged.role === "MASTER";

  const whatsappSettings = canSeeWhatsApp ? whatsappRead : null;

  return (
    <Tabs defaultValue="account" className="mt-6">
      <TabsList className="w-full sm:w-auto" data-tutorial="profile-tabs">
        <TabsTrigger value="account" className="flex-1 sm:flex-auto gap-2">
          <Settings className="h-4 w-4" />
          Configurações
        </TabsTrigger>

        <TabsTrigger
          value="notifications"
          className="flex-1 sm:flex-auto gap-2"
        >
          <Bell className="h-4 w-4" />
          Notificações
        </TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="mt-6">
        <Card data-tutorial="profile-account">
          <CardContent className="px-6">
            <AvatarUpload
              userName={userLogged.name}
              avatarUrl={userLogged.avatar}
            />
            <div className="divide-y divide-muted">
              <UserNameForm
                userName={userLogged.name}
                error={userResponseError}
              />
              <UserPasswordForm error={userResponseError} />
              <UserTwoFactorAuthentication
                error={userResponseError}
                isTwoFactorEnabled={userLogged.two_factor_enabled}
              />
              <UserAppearance />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="notifications" className="mt-6">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <NotificationPreferences
                initialPreferences={notificationPreferences}
              />
            </CardContent>
          </Card>

          {canSeeWhatsApp && (
            <WhatsAppNotifications
              error={userResponseError}
              userRole={userLogged.role}
              driverId={userLogged.driverId}
              initialSettings={whatsappSettings}
            />
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export { ProfileContent };
