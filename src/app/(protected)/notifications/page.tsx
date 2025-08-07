import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../_components/layout/protected-page-container";
import { ProtectedHeading } from "../_components/layout/protected-heading";

import { NotificationList } from "../_components/notification-list";
import { getCookies } from "@/actions/cookies";

interface NotificationsQueryParamsProps {
  searchParams: { limit?: string; includeRead?: string };
}

export function generateMetadata(): Metadata {
  return {
    title: "Notificações",
    description: "Visualize e gerencie suas notificações recentes.",
  };
}

const Notifications = async ({
  searchParams,
}: NotificationsQueryParamsProps) => {
  const tokenAccess = await getCookies("tkey");

  const limit = Number(searchParams.limit) || 10;
  const includeRead =
    searchParams.includeRead === "true" ||
    searchParams.includeRead === undefined;

  let notificationsResponseError = {
    error: false,
    errorMessage: "",
  };

  let notifications = { data: [], total: 0, unread: 0 };
  let response: Response | undefined;

  try {
    const queryParams = new URLSearchParams();

    if (limit) queryParams.append("limit", limit.toString());
    queryParams.append("includeRead", includeRead.toString());

    response = await fetch(
      `${process.env.HTTP_REQUEST}/notification/list?${queryParams.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${tokenAccess}`,
        },
        next: {
          tags: [
            "create-notification",
            "delete-notification",
            "update-notification",
          ],
        },
      },
    );
  } catch (error) {
    notificationsResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar as notificações",
    };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      notificationsResponseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar as notificações",
      };
    } else {
      notifications = await response.json();
    }
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title="Minhas Notificações"
        description="Visualize e gerencie suas notificações recentes."
      />
      <NotificationList
        initialData={notifications}
        responseError={notificationsResponseError}
        currentLimit={limit}
        currentIncludeRead={includeRead}
      />
    </PageContainer>
  );
};

export default Notifications;
