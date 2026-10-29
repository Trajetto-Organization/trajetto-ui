import { Suspense } from "react";
import { cookies } from "next/headers";

import { readSidebarOpen } from "@/lib/sidebar-state";

import { ProtectedProvider } from "./_components/layout/protected-provider";
import { ProtectedDynamicLoading } from "./_components/loading-page/protected-dynamic-loading";

import { NotificationsProvider } from "./_components/layout/protected-provider/notifications-provider";
import { SidebarDefaultOpen } from "./_components/layout/protected-provider/sidebar-wrapper/sidebar-default-open";

/**
 * Every fetch under the authenticated tree carries somebody's token, and none
 * may be written to Next's data cache: a cached answer would outlive a revoked
 * session or a changed permission. Today they stay out only because each page
 * reads `cookies()` first. `only-no-store` makes it a rule — an explicit
 * `revalidate` becomes inert and `force-cache` throws — which `force-dynamic`
 * and `default-no-store` do not do for an explicit revalidate in Next 14.
 */
export const fetchCache = "only-no-store";

type RootProtectedLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

const RootProtectedLayout = ({
  children,
}: RootProtectedLayoutProps): JSX.Element => {
  // Read here, on the server, so the first paint already has the sidebar the
  // person left (the cookie is written by the sidebar on every toggle) —
  // the loading skeleton as well as the sidebar that replaces it.
  const sidebarOpen = readSidebarOpen(cookies());

  return (
    <SidebarDefaultOpen value={sidebarOpen}>
      <Suspense
        fallback={<ProtectedDynamicLoading sidebarOpen={sidebarOpen} />}
      >
        <NotificationsProvider>
          <ProtectedProvider>{children}</ProtectedProvider>
        </NotificationsProvider>
      </Suspense>
    </SidebarDefaultOpen>
  );
};

export default RootProtectedLayout;
