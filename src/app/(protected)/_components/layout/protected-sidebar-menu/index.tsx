"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { useAuthStore } from "@/store/auth-store";
import { canAccessPath } from "@/lib/route-access";

import { useChatUnreadCount } from "@/features/deliveries/chat/lib/use-chat-unread";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import { NOTIFICATION_ACCENT_CLASS } from "../../shared/notification-visuals";

import type { ProtectedNavItem } from "../shared/common.types";

import type {
  ProtectedNavItemsProps,
  ProtectedSidebarMenuItemsProps,
  User,
} from "./protected-sidebar-menu.types";
import {
  navigationSurface,
  protectedNavIcons,
  sidebarItems,
} from "../protected-navbar-items";

/**
 * A driver is a BUSINESS_USER linked to a driver record. Same rule as the
 * layout that picks the driver shell and as the API's permission gate: the
 * driver link decides, whatever profile rows the account may still carry.
 */
function isDriver(user: Pick<User, "role" | "driverId">): boolean {
  return user.role === "BUSINESS_USER" && Boolean(user.driverId);
}

/**
 * What this session's sidebar shows. The entries come from the one
 * navigation list the command palette also reads, and the verdict from the
 * route registry (app-routes) — two hand-written lists is how the palette
 * offered an employee Torre de Controle and Integrações that the sidebar did
 * not (NAV-DRIFT-1).
 */
function visibleSidebarItems(
  user: User,
  enabledModules: string[] | null,
): ProtectedNavItem[] {
  const driver = isDriver(user);

  // An employee without a profile has nothing to open; the session check
  // signs them out.
  if (user.role === "BUSINESS_USER" && !driver && !user.permissions) {
    return [];
  }

  const context = {
    role: user.role,
    permissions: user.permissions ?? [],
    enabledModules,
    isDriver: driver,
  };

  return sidebarItems(navigationSurface(user.role, driver), (path) =>
    canAccessPath(path, context),
  );
}

const ProtectedNavItems = ({ items }: ProtectedNavItemsProps): JSX.Element => {
  const pathname = usePathname();

  // The chat is a tab inside Entregas, so its unread count rides on that
  // entry: the dispatcher sees it from the Kanban, from Multas, from
  // anywhere. Zero for anyone without the module, the permission, or a read
  // cursor of their own — support included.
  const chatUnread = useChatUnreadCount();

  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = item.icon
          ? protectedNavIcons[item.icon]
          : protectedNavIcons.logo;
        if (item.items && item.items.length > 0) {
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={pathname === item.url}
                  >
                    {item.icon && <Icon />}
                    <span>{item.title}</span>
                    <ChevronRight
                      className="ml-auto transition-transform duration-200 
                      group-data-[state=open]/collapsible:rotate-90"
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === subItem.url}
                        >
                          <Link href={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        } else {
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={pathname === item.url}
              >
                <Link href={item.url}>
                  {item.icon && <Icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>

              {/* The bell's badge, to the class: same accent constant, same
              ring lifting it off its surface — here the sidebar's own, since
              that is what sits behind it. The hover and active overrides
              `SidebarMenuBadge` carries for text colour have to be answered
              at the same variant, or the number turns grey under the
              pointer. */}
              {item.url.endsWith("/deliveries") && chatUnread > 0 && (
                <SidebarMenuBadge
                  className={cn(
                    `h-5 min-w-5 rounded-full px-1 text-[10px] font-bold
                    text-white ring-2 ring-sidebar
                    peer-hover/menu-button:text-white
                    peer-data-[active=true]/menu-button:text-white`,
                    NOTIFICATION_ACCENT_CLASS,
                  )}
                  aria-label={`${chatUnread} ${
                    chatUnread === 1
                      ? "conversa não lida"
                      : "conversas não lidas"
                  }`}
                >
                  {chatUnread > 99 ? "99+" : chatUnread}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          );
        }
      })}
    </SidebarMenu>
  );
};

const ProtectedSidebarMenuItems = ({
  user,
}: ProtectedSidebarMenuItemsProps): JSX.Element => {
  // Modules arrive with the server render and are kept fresh by the security
  // check, which re-reads /user/me on every socket event. No fetch of its own:
  // the endpoint that manages plans is back-office only, and asking it from
  // here is what used to erase every gated item from an employee's menu.
  const storeModules = useAuthStore((state) => state.enabledModules);
  const enabledModules = storeModules ?? user.enabledModules ?? null;

  return (
    <ProtectedNavItems items={visibleSidebarItems(user, enabledModules)} />
  );
};

export { ProtectedSidebarMenuItems, visibleSidebarItems };
