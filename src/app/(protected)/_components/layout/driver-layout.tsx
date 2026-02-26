"use client";

import Image from "next/image";
import { ReactNode } from "react";

import { QueryClientProvider } from "react-query";
import { queryClientProps } from "@/lib/query-client-props";

import { ProtectedAccountSettings } from "./protected-account-settings";
import { SidebarWrapper } from "./protected-provider/sidebar-wrapper";

import { SearchInput } from "./protected-search-input";
import { UserLogged } from "./dto";

interface DriverLayoutProps {
  children: ReactNode;
  userLogged: UserLogged;
}

const TrajettoLogo = ({ className }: { className?: string }) => (
  <Image
    src="/trajetto-logo.png"
    alt="Trajetto"
    width={120}
    height={32}
    className={`h-7 w-auto ${className || ""}`}
  />
);

const DriverLayout = ({ children, userLogged }: DriverLayoutProps) => {
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
                <TrajettoLogo className="h-6 sm:h-7 w-auto flex-shrink-0" />
                <div className="flex-1 max-w-md mx-2 sm:mx-4">
                  <SearchInput />
                </div>
              </div>
            </div>
            <div className="w-44 sm:w-56 flex-shrink-0">
              <ProtectedAccountSettings userLogged={userLogged} />
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
