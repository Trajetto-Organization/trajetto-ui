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
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import { ProtectedBreadCrumbs } from "../protected-breadcrumbs";
import { ProtectedSidebarMenuItems } from "../protected-sidebar-menu";

import { ProtectedAccountSettings } from "../protected-account-settings";
import { ProtectedGetAppButton } from "../protected-get-app-button";

import { SearchInput } from "../protected-search-input";
import { ProtectedNotificationsMenu } from "../protected-notifications-menu";

import { TutorialProvider } from "../protected-tutorial/tutorial-provider";
import TutorialComponent from "../protected-tutorial/tutorial-component";

import { TutorialMenuItem } from "../protected-tutorial/tutorial-button";

import { useAuthStore } from "@/store/auth-store";
import { SidebarWrapper } from "../protected-provider/sidebar-wrapper";

import { ProtectedTrajettoLogo } from "../protected-trajetto-logo";

import { ChatGlobalListener } from "@/features/deliveries/chat/global-listener";

import type { DefaultLayoutProps } from "./default-layout.types";

const DefaultLayout = ({
  children,
  userLogged,
}: DefaultLayoutProps): JSX.Element => {
  const roleMapping = {
    BUSINESS_ADMIN: "Administrador 👑",
    BUSINESS_USER: "Colaborador ♦️",
    MASTER: "Master 👑",
  };

  const company = {
    name: "Trajetto",
    logo: ProtectedTrajettoLogo,
    plan: roleMapping[userLogged.role],
  };

  // Use auth store (updated in real-time by Socket.IO) for sidebar permissions
  // Falls back to server props on first render before store is populated
  const { permissions: storePermissions } = useAuthStore();

  const userPermissions =
    storePermissions.length > 0
      ? storePermissions.map((p) => p.permissionKey)
      : userLogged.permissions?.map((p) => p.permissionKey);

  const tutorialUserPermissions = {
    role: userLogged.role,
    permissions: userLogged.permissions,
  };

  const sidebarUser = {
    role: userLogged.role,
    permissions: userPermissions,
    driverId: userLogged.driverId,
    profileAccess: userLogged.profileAccess,
    enabledModules: userLogged.enabledModules,
  };

  return (
    <QueryClientProvider client={queryClientProps}>
      {/* Renders nothing. It is the chat listening on every screen, so the
      unread badge and the driver's delivered check stop depending on the
      chat tab being open — it sits inside the provider because it lives on
      the same thread-list query the panel uses. */}
      <ChatGlobalListener />

      <TutorialProvider userPermissions={tutorialUserPermissions}>
        <SidebarWrapper>
          <TutorialComponent />
          <Sidebar collapsible="icon">
            <SidebarHeader>
              <div
                className="flex gap-2 py-2
                text-sidebar-accent-foreground"
              >
                <div
                  className="flex aspect-square size-8
                  items-center justify-center rounded-lg
                  bg-sidebar-primary text-sidebar-primary-foreground"
                >
                  <company.logo className="size-4" />
                </div>
                <div
                  className="grid flex-1 text-left
                  text-sm leading-tight"
                >
                  <span className="truncate font-semibold">{company.name}</span>
                  <span className="truncate text-xs">{company.plan}</span>
                </div>
              </div>
            </SidebarHeader>

            <ScrollArea
              className="h-full"
              style={{
                touchAction: "pan-y",
                overscrollBehavior: "contain",
              }}
              data-sidebar-menu
            >
              <SidebarContent className="overflow-x-hidden">
                <SidebarGroup>
                  <SidebarGroupLabel>
                    {userLogged.role.startsWith("MASTER")
                      ? "Administração"
                      : "Visão geral"}
                  </SidebarGroupLabel>
                  <ProtectedSidebarMenuItems user={sidebarUser} />
                </SidebarGroup>
              </SidebarContent>
            </ScrollArea>

            <SidebarFooter>
              <div className="pb-1">
                <ProtectedGetAppButton />
              </div>

              {userLogged.role !== "MASTER" && (
                <div className="hidden md:flex">
                  <TutorialMenuItem />
                </div>
              )}

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
              className="flex h-14 shrink-0 items-center justify-between
              gap-2 transition-[width,height] ease-linear border-b
              group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
            >
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" data-sidebar-trigger />
                <Separator orientation="vertical" className="mr-2 h-4" />

                <ProtectedBreadCrumbs />
              </div>

              <div className="flex items-center gap-2 pr-4">
                <SearchInput />
                <ProtectedNotificationsMenu />
              </div>
            </header>
            <main className="px-6 pt-6 h-full w-full">{children}</main>
          </SidebarInset>
        </SidebarWrapper>
      </TutorialProvider>
    </QueryClientProvider>
  );
};

export { DefaultLayout };
