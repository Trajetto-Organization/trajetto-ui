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
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
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
  const roleMapping = {
    BUSINESS_ADMIN: "Administrador 👑",
    BUSINESS_USER: "Usuário ♦️",
    MASTER: "Master 👑",
  };

  const company = {
    name: "Trajetto",
    logo: TrajettoLogo,
    plan: roleMapping[userLogged.role],
  };

  const userPermissions = userLogged.permissions?.map(
    (permissions) => permissions.permissionKey,
  );

  // Prepare user permissions for tutorial
  const tutorialUserPermissions = {
    role: userLogged.role,
    permissions: userLogged.permissions,
  };

  useProtectedLayout(userLogged, error, notificationError);

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
                  <ProtectedSidebarMenuItems
                    userRole={userLogged.role}
                    userPermissions={userPermissions}
                  />
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
