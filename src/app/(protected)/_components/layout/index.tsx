"use client";

import { ReactNode } from "react";
import Image from "next/image";

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

import { ProtectedBreadCrumbs } from "./protected-breadcrumbs";

import { ProtectedSidebarMenuItems } from "./protected-sidebar-menu";
import { ProtectedAccountSettings } from "./protected-account-settings";

import { ProtectedGetAppButton } from "./protected-get-app-button";
import { SearchInput } from "./protected-search-input";

import { Permission, UserRole } from "../dto";
import { useProtectedLayout } from "./hooks";

import { TutorialProvider } from "../tutorial/tutorial-provider";
import TutorialComponent from "../tutorial/tutorial-component";

import { TutorialMenuItem } from "../tutorial/tutorial-button";
import { SidebarWrapper } from "./protected-provider/sidebar-wrapper";

interface UserLogged {
  id?: string;
  businessId?: string;
  avatar?: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  driverId?: string | null;
  profileAccess?: {
    permissions?: Permission[];
  } | null;
}

interface ProtectedLayoutLayoutProps {
  userLogged: UserLogged;
  children: ReactNode;
  error: boolean;
  notificationCount: number;
  notificationError: boolean;
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

const ProtectedLayout = ({
  children,
  userLogged,
  error,
  notificationCount = 0,
  notificationError = false,
}: ProtectedLayoutLayoutProps): JSX.Element => {
  // Determine if you are a driver
  const isDriver = userLogged.role === "BUSINESS_USER" && !!userLogged.driverId;

  const roleMapping = {
    BUSINESS_ADMIN: "Administrador 👑",
    BUSINESS_USER: "Colaborador ♦️",
    MASTER: "Master 👑",
  };

  const company = {
    name: "Trajetto",
    logo: TrajettoLogo,
    plan: isDriver ? "Motorista 🚗" : roleMapping[userLogged.role],
  };

  const userPermissions = userLogged.permissions?.map(
    (permissions) => permissions.permissionKey,
  );

  // Prepare user permissions for tutorial
  const tutorialUserPermissions = {
    role: userLogged.role,
    permissions: userLogged.permissions,
  };

  // Prepare user object for sidebar (with driverId and profileAccess)
  const sidebarUser = {
    role: userLogged.role,
    permissions: userPermissions,
    driverId: userLogged.driverId,
    profileAccess: userLogged.profileAccess,
  };

  useProtectedLayout(userLogged, error, notificationError);

  // If you are a driver, render a simplified layout without a sidebar
  if (isDriver) {
    return (
      <QueryClientProvider client={queryClientProps}>
        <SidebarWrapper>
          <div
            className="flex h-screen 
            w-full flex-col"
          >
            <header
              className="flex h-14 sm:h-14 shrink-0
              items-center justify-between
              gap-2 border-b px-4"
            >
              <div
                className="flex items-center 
                gap-3 min-w-0 flex-1"
              >
                <div
                  className="flex items-center 
                  gap-2 sm:gap-3"
                >
                  <company.logo
                    className="h-6 sm:h-7 
                    w-auto flex-shrink-0"
                  />
                  <div
                    className="flex flex-col sm:flex-row 
                    sm:items-baseline sm:gap-2"
                  >
                    <span className="font-semibold text-xs">
                      {company.name}
                    </span>
                    <span
                      className="text-[10px] sm:text-xs 
                      text-muted-foreground whitespace-nowrap"
                    >
                      {company.plan}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-44 sm:w-56 flex-shrink-0">
                <ProtectedAccountSettings
                  userLogged={userLogged}
                  notificationCount={notificationCount}
                />
              </div>
            </header>
            <main
              className="flex-1 px-6
              overflow-auto pt-6 mb-7"
            >
              {children}
            </main>
          </div>
        </SidebarWrapper>
      </QueryClientProvider>
    );
  }

  // Normal layout with sidebar for other users
  return (
    <QueryClientProvider client={queryClientProps}>
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
                  <ProtectedAccountSettings
                    userLogged={userLogged}
                    notificationCount={notificationCount}
                  />
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

              <SearchInput />
            </header>
            <main className="px-6 pt-6 h-full w-full">{children}</main>
          </SidebarInset>
        </SidebarWrapper>
      </TutorialProvider>
    </QueryClientProvider>
  );
};

export { ProtectedLayout };
