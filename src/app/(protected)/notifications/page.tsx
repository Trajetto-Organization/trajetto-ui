import { Metadata } from "next";

import PageContainer from "../_components/layout/protected-page-container";
import { ProtectedHeading } from "../_components/layout/protected-heading";

import { NotificationList } from "../_components/notification-list";

export function generateMetadata(): Metadata {
  return {
    title: "Notificações",
    description: "Visualize e gerencie suas notificações recentes.",
  };
}

const Notifications = (): JSX.Element => {
  return (
    <PageContainer>
      <ProtectedHeading
        title="Minhas Notificações"
        description="Visualize e gerencie suas notificações recentes."
      />
      <NotificationList
        responseError={{
          error: false,
          errorMessage: "",
        }}
      />
    </PageContainer>
  );
};

export default Notifications;
