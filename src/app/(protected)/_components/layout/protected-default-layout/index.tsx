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

import { ProtectedBreadCrumbs } from "../protected-breadcrumbs";
import { ProtectedSidebarMenuItems } from "../protected-sidebar-menu";

import { ProtectedAccountSettings } from "../protected-account-settings";
import {
  ProtectedHeaderThemeToggle,
  ProtectedSidebarThemeSwitch,
} from "../protected-theme-switch";
import { ProtectedGetAppButton } from "../protected-get-app-button";

import { SearchInput } from "../protected-search-input";
import { ProtectedNotificationsMenu } from "../protected-notifications-menu";

import { TutorialProvider } from "../protected-tutorial/tutorial-provider";
import { LazyTutorialComponent } from "../protected-tutorial/tutorial-component/lazy";

import { TutorialMenuItem } from "../protected-tutorial/tutorial-button";

import { useAuthStore } from "@/store/auth-store";
import { readablePermissionKeys } from "@/lib/route-access";
import { SidebarWrapper } from "../protected-provider/sidebar-wrapper";

import { ProtectedTrajettoLogo } from "../protected-trajetto-logo";

import { ChatGlobalListener } from "@/features/deliveries/chat/global-listener";
import { OpsAlertBalloon } from "@/features/deliveries/ops-alert/ops-alert-balloon";

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

  // Readable keys only: a profile row with canRead false opens nothing.
  const userPermissions =
    storePermissions.length > 0
      ? readablePermissionKeys(storePermissions)
      : userLogged.permissions
        ? readablePermissionKeys(userLogged.permissions)
        : undefined;

  // The provider prefers the live store for permissions and modules; these
  // are the server snapshot for the first render.
  const tutorialUser = {
    id: userLogged.id,
    role: userLogged.role,
    permissions: userLogged.permissions,
    enabledModules: userLogged.enabledModules,
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

      {/* Decision 14.6: the operations alert, bottom-right on every page of
      someone who works the deliveries (renders nothing for anyone else). */}
      <OpsAlertBalloon />

      <TutorialProvider user={tutorialUser}>
        <SidebarWrapper>
          <LazyTutorialComponent />
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

            <SidebarScrollArea
              style={{
                touchAction: "pan-y",
                overscrollBehavior: "contain",
              }}
              data-sidebar-menu
              data-tutorial="sidebar-menu"
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
            </SidebarScrollArea>

            <SidebarFooter>
              {/* No "Documentação da API" here (decision 16.60): the portal
                  is reached from the public site, ⌘K and Integrações. */}
              <div className="flex flex-col gap-2 pb-1">
                <ProtectedGetAppButton />
              </div>

              {/* Every role, phones included: the back office's tours are
                  on demand (decision 9.2) and the phone has a sheet variant
                  (decision 9.3). */}
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
              className="flex h-14 shrink-0 items-center justify-between
              gap-2 transition-[width,height] ease-linear border-b
              md:group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
            >
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" data-sidebar-trigger />
                <Separator orientation="vertical" className="mr-2 h-4" />

                <ProtectedBreadCrumbs />
              </div>

              <div className="flex items-center gap-2 pr-4">
                <SearchInput />
                <ProtectedHeaderThemeToggle />
                <ProtectedNotificationsMenu />
              </div>
            </header>
            {/* The div is deliberate: SidebarInset already renders the
                <main>, and two nested main landmarks are invalid HTML — a
                screen reader announces two primary regions and the
                skip-to-content shortcut becomes ambiguous. */}
            {/*
              `px-4` on a phone, not `px-6`.

              This 24px sits OUTSIDE the page container's own 16px, so at
              320px the two together took 80 of the 320 — a quarter of the
              screen — and every page got 240px to work in. It is what made
              the three counters on Auditoria de Comprovantes stack one per
              line beside a button, on a screen that had room for two of
              them. A desk loses nothing; a phone gets 16px back on each
              side.
            */}
            <div className="h-full w-full px-4 pt-6 sm:px-6">{children}</div>
          </SidebarInset>
        </SidebarWrapper>
      </TutorialProvider>
    </QueryClientProvider>
  );
};

export { DefaultLayout };
