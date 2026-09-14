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

import type { PermissionKey, UserRole } from "../../shared/common.types";
import type { ProtectedNavItem } from "../shared/common.types";

import type {
  ProtectedNavItemsProps,
  ProtectedSidebarMenuItemsProps,
  User,
} from "./protected-sidebar-menu.types";
import {
  protectedNavIcons,
  protectedNavItemsByRole,
} from "../protected-navbar-items";

/**
 * Checks if user is a driver (BUSINESS_USER with driverId but no profileAccess)
 */
function isDriver(user: User): boolean {
  if (user.role !== "BUSINESS_USER") return false;

  const hasDriverId = !!user.driverId;
  const hasProfileAccess =
    user.profileAccess &&
    user.profileAccess.permissions &&
    user.profileAccess.permissions.length > 0;

  return hasDriverId && !hasProfileAccess;
}

interface NavFilterContext {
  role: UserRole;
  permissions: PermissionKey[];
  enabledModules: string[] | null;
  isDriver: boolean;
}

/**
 * Drops what this session may not reach. The verdict comes from the route
 * registry (app-routes) rather than from tags on each entry — a menu that
 * declared its own rules is what let the command bar drift out of sync with
 * the sidebar for the whole FLEET module.
 *
 * A group ("#") has no page of its own, so it survives only while at least
 * one child does.
 */
const filterNavItems = (
  items: ProtectedNavItem[],
  context: NavFilterContext,
): ProtectedNavItem[] => {
  return items.reduce<ProtectedNavItem[]>((acc, item) => {
    const isGroup = !item.url || item.url === "#";

    if (!isGroup && !canAccessPath(item.url, context)) {
      return acc;
    }

    const newItem = { ...item };

    if (newItem.items?.length) {
      newItem.items = filterNavItems(newItem.items, context);
    }

    if (isGroup && (!newItem.items || newItem.items.length === 0)) {
      return acc;
    }

    acc.push(newItem);
    return acc;
  }, []);
};

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

  const items =
    protectedNavItemsByRole[user.role] ||
    protectedNavItemsByRole["BUSINESS_USER"];

  // If you are a driver, it does not display any sidebar items (you will only have access via direct routes)
  if (isDriver(user)) {
    return <ProtectedNavItems items={[]} />;
  }

  // If you are an employee but do not have permissions, it also returns empty.
  if (user.role === "BUSINESS_USER" && !user.permissions) {
    return <ProtectedNavItems items={[]} />;
  }

  const filteredItems = filterNavItems(items, {
    role: user.role,
    permissions: user.permissions || [],
    enabledModules,
    isDriver: false,
  });

  return <ProtectedNavItems items={filteredItems} />;
};

export { ProtectedSidebarMenuItems };
