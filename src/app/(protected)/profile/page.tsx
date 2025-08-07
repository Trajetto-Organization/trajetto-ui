import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCookies } from "@/actions/cookies";
import { Bell, Settings } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

import { ProtectedHeading } from "../_components/layout/protected-heading";
import PageContainer from "../_components/layout/protected-page-container";

import { UserNameForm } from "../_components/profile/account/user-name-form";
import { UserPasswordForm } from "../_components/profile/account/user-password-form";

import { UserTwoFactorAuthentication } from "../_components/profile/account/user-two-factor-authentication";

import { WhatsAppNotifications } from "../_components/profile/notifications/whatsapp/components/whatsAppNotifications";
import { WhatsAppProvider } from "../_components/profile/notifications/whatsapp/provider";

import { EmailNotifications } from "../_components/profile/notifications/email/components/emailNotifications";
import { ActivityNotifications } from "../_components/profile/notifications/activity/components/activityNotifications";

import { UserLoggedProps, UserRole } from "../_components/dto";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Minha Conta",
    description: `
      Gerencie sua conta, configure preferências, atualize sua senha, 
      habilite a autenticação de dois fatores, configure notificações
      e personalize seu perfil para uma experiência mais segura.
    `,
  };
}

async function getProfileData() {
  const tokenAccess = await getCookies("tkey");

  let userLogged = {
    email: "",
    name: "Usuário",
    role: "user" as UserRole,
    two_factor_enabled: false,
    email_notifications_enabled: true,
    activity_notifications_enabled: true,
  };

  let userResponseError = false;

  try {
    const response = await fetch(`${process.env.HTTP_REQUEST}/user/me`, {
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
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
      if (response.status === 401) {
        redirect("/login?error=auth_not_authorized");
      }
      userResponseError = true;
    }

    const data: UserLoggedProps = await response.json();

    if (data?.user) {
      userLogged = {
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        two_factor_enabled: data.user.two_factor_enabled as boolean,
        email_notifications_enabled:
          data.user.email_notifications_enabled ?? true,
        activity_notifications_enabled:
          data.user.activity_notifications_enabled ?? true,
      };
    }
  } catch (error) {
    userResponseError = true;
  }

  return { userLogged, userResponseError };
}

async function getWhatsAppSettings() {
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/whatsapp/settings`,
      {
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
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

const Profile = async (): Promise<JSX.Element> => {
  const { userLogged, userResponseError } = await getProfileData();

  // Check permission to view notifications
  const canSeeNotifications =
    userLogged.role === "BUSINESS_USER" || userLogged.role === "BUSINESS_ADMIN";

  // Search WhatsApp settings only if you have permission
  const whatsappSettings = canSeeNotifications
    ? await getWhatsAppSettings()
    : null;

  return (
    <PageContainer>
      <ProtectedHeading
        title="Meu Perfil"
        description="Gerencie sua conta e configurações"
      />

      <WhatsAppProvider initialSettings={whatsappSettings}>
        <Tabs defaultValue="account" className="mt-6">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="account" className="flex-1 sm:flex-auto gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
            {canSeeNotifications && (
              <TabsTrigger
                value="notifications"
                className="flex-1 sm:flex-auto gap-2"
              >
                <Bell className="h-4 w-4" />
                Notificações
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="account" className="mt-6">
            <Card>
              <CardContent className="px-6">
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {canSeeNotifications && (
            <TabsContent value="notifications" className="mt-6">
              <div className="space-y-6">
                <WhatsAppNotifications error={userResponseError} />

                <Card>
                  <CardContent className="p-6">
                    <EmailNotifications
                      initialEnabled={userLogged.email_notifications_enabled}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <ActivityNotifications
                      initialEnabled={userLogged.activity_notifications_enabled}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </WhatsAppProvider>
    </PageContainer>
  );
};

export default Profile;
