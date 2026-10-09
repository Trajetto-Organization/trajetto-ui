"use client";

import { QueryClientProvider } from "react-query";
import { queryClientProps } from "@/lib/query-client-props";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  SidebarScrollArea,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { Separator } from "@/components/ui/separator";

import { ProtectedAccountSettings } from "../protected-account-settings";
import {
  ProtectedHeaderThemeToggle,
  ProtectedSidebarThemeSwitch,
} from "../protected-theme-switch";
import { SidebarWrapper } from "../protected-provider/sidebar-wrapper";

import { ProtectedTrajettoLogo } from "../protected-trajetto-logo";
import { SearchInput } from "../protected-search-input";

import { ProtectedNotificationsMenu } from "../protected-notifications-menu";
import { ProtectedBreadCrumbs } from "../protected-breadcrumbs";
import { ProtectedSidebarMenuItems } from "../protected-sidebar-menu";

import { TutorialProvider } from "../protected-tutorial/tutorial-provider";
import { LazyTutorialComponent } from "../protected-tutorial/tutorial-component/lazy";
import { TutorialMenuItem } from "../protected-tutorial/tutorial-button";

import type { DriverLayoutProps } from "./driver-layout.types";

/**
 * The driver's shell on the web (decision 4.8).
 *
 * It had no navigation at all: Kanban, Meus veículos and Contas a pagar were
 * reachable only through ⌘K or a typed URL. It now has the same sidebar as
 * everyone else, fed by the driver's entries of the one navigation list and
 * filtered by the same registry — Contas a pagar disappears without FLEET.
 * No chat listener: that belongs to the office screens. The guided tours are
 * the short driver ones (decision 9.2).
 */
const DriverLayout = ({
  children,
  userLogged,
}: DriverLayoutProps): JSX.Element => {
  const sidebarUser = {
    role: userLogged.role,
    driverId: userLogged.driverId,
    profileAccess: userLogged.profileAccess,
    enabledModules: userLogged.enabledModules,
  };

  return (
    <QueryClientProvider client={queryClientProps}>
      <TutorialProvider
        user={{
          id: userLogged.id,
          role: userLogged.role,
          enabledModules: userLogged.enabledModules,
          isDriver: true,
        }}
      >
        <SidebarWrapper>
          <LazyTutorialComponent />
          <Sidebar collapsible="icon">
            <SidebarHeader>
              <div className="flex gap-2 py-2 text-sidebar-accent-foreground">
                <div
                  className="flex aspect-square size-8 items-center
                justify-center rounded-lg bg-sidebar-primary
                text-sidebar-primary-foreground"
                >
                  <ProtectedTrajettoLogo className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Trajetto</span>
                  <span className="truncate text-xs">Motorista</span>
                </div>
              </div>
            </SidebarHeader>

            <SidebarScrollArea
              style={{ touchAction: "pan-y", overscrollBehavior: "contain" }}
              data-sidebar-menu
              data-tutorial="sidebar-menu"
            >
              <SidebarContent className="overflow-x-hidden">
                <SidebarGroup>
                  <SidebarGroupLabel>Minhas páginas</SidebarGroupLabel>
                  <ProtectedSidebarMenuItems user={sidebarUser} />
                </SidebarGroup>
              </SidebarContent>
            </SidebarScrollArea>

            <SidebarFooter>
              <div className="flex">
                <TutorialMenuItem />
              </div>

              {/* Phones only: the header has no room for the switch there. */}
              <ProtectedSidebarThemeSwitch />

              <SidebarMenu>
                <SidebarMenuItem>
                  <ProtectedAccountSettings userLogged={userLogged} />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
          </Sidebar>

          <SidebarInset className="overflow-hidden">
            <header
              className="flex h-14 shrink-0 items-center justify-between gap-2
            border-b transition-[width,height] ease-linear
            md:group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
            >
              <div className="flex min-w-0 items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" data-sidebar-trigger />
                <Separator orientation="vertical" className="mr-2 h-4" />

                <ProtectedBreadCrumbs />
              </div>

              <div className="flex items-center gap-2 pr-4">
                <SearchInput />
                <ProtectedHeaderThemeToggle />
                <ProtectedNotificationsMenu isDriver />
              </div>
            </header>

            <div className="h-full w-full px-4 pb-7 pt-6 sm:px-6">
              {children}
            </div>
          </SidebarInset>
        </SidebarWrapper>
      </TutorialProvider>
    </QueryClientProvider>
  );
};

export { DriverLayout };
