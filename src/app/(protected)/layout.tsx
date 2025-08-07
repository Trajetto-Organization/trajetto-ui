import { Suspense } from "react";

import { ProtectedProvider } from "./_components/layout/protected-provider";
import { ProtectedPageLoading } from "./_components/loading-page/protected-page-loading";

import { NotificationsProvider } from "./_components/layout/protected-provider/notifications-provider";

type RootProtectedLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

const RootProtectedLayout = ({
  children,
}: RootProtectedLayoutProps): JSX.Element => {
  return (
    <Suspense fallback={<ProtectedPageLoading />}>
      <NotificationsProvider>
        <ProtectedProvider>{children}</ProtectedProvider>
      </NotificationsProvider>
    </Suspense>
  );
};

export default RootProtectedLayout;
