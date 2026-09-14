"use client";

import { QueryClientProvider } from "react-query";
import { queryClientProps } from "@/lib/query-client-props";

import { ProtectedAccountSettings } from "../protected-account-settings";
import { SidebarWrapper } from "../protected-provider/sidebar-wrapper";

import { ProtectedTrajettoLogo } from "../protected-trajetto-logo";
import { SearchInput } from "../protected-search-input";

import { ProtectedNotificationsMenu } from "../protected-notifications-menu";

import type { DriverLayoutProps } from "./driver-layout.types";

const DriverLayout = ({
  children,
  userLogged,
}: DriverLayoutProps): JSX.Element => {
  return (
    <QueryClientProvider client={queryClientProps}>
      <SidebarWrapper>
        <div className="flex h-screen w-full flex-col">
          <header
            className="flex h-14 sm:h-14 shrink-0
            items-center justify-between
            gap-2 border-b px-4"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3">
                <ProtectedTrajettoLogo className="h-6 sm:h-7 w-auto flex-shrink-0" />
                <div className="flex-1 max-w-md mx-2 sm:mx-4">
                  <SearchInput />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ProtectedNotificationsMenu />
              <div className="w-44 sm:w-56">
                <ProtectedAccountSettings userLogged={userLogged} />
              </div>
            </div>
          </header>
          <main className="flex-1 px-6 overflow-auto pt-6 mb-7">
            {children}
          </main>
        </div>
      </SidebarWrapper>
    </QueryClientProvider>
  );
};

export { DriverLayout };
