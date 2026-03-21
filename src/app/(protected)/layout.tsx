import { Suspense } from "react";

import { ProtectedProvider } from "./_components/layout/protected-provider";
import { ProtectedDynamicLoading } from "./_components/loading-page/protected-dynamic-loading";

import { NotificationsProvider } from "./_components/layout/protected-provider/notifications-provider";

type RootProtectedLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

const RootProtectedLayout = ({
  children,
}: RootProtectedLayoutProps): JSX.Element => {
  return (
    <Suspense fallback={<ProtectedDynamicLoading />}>
      <NotificationsProvider>
        <ProtectedProvider>{children}</ProtectedProvider>
      </NotificationsProvider>
    </Suspense>
  );
};

export default RootProtectedLayout;
