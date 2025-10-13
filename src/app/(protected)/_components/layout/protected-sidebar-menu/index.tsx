"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import { PermissionKey, UserRole } from "../../dto";
import {
  protectedNavIcons,
  ProtectedNavItem,
  protectedNavItemsByRole,
} from "../protected-navbar-items";

interface User {
  role: UserRole;
  permissions?: PermissionKey[];
  driverId?: string | null;
  profileAccess?: {
    permissions?: { permissionKey: PermissionKey }[];
  } | null;
}

interface ProtectedSidebarMenuItemsProps {
  user: User;
}

interface ProtectedNavItemsProps {
  items: ProtectedNavItem[];
}

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

const filterNavItems = (
  items: ProtectedNavItem[],
  userPermissions: PermissionKey[],
): ProtectedNavItem[] => {
  return items.reduce<ProtectedNavItem[]>((acc, item) => {
    if (
      item.requiredPermission &&
      !userPermissions.includes(item.requiredPermission)
    ) {
      return acc;
    }

    const newItem = { ...item };

    if (newItem.items?.length) {
      newItem.items = filterNavItems(newItem.items, userPermissions);
    }

    const isGroup = newItem.url === "#" || !newItem.url;
    if (isGroup && (!newItem.items || newItem.items.length === 0)) {
      return acc;
    }

    acc.push(newItem);
    return acc;
  }, []);
};

const ProtectedNavItems = ({ items }: ProtectedNavItemsProps): JSX.Element => {
  const pathname = usePathname();

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

  // Filter items by employee permissions
  const filteredItems = filterNavItems(items, user.permissions || []);
  return <ProtectedNavItems items={filteredItems} />;
};

export { ProtectedSidebarMenuItems };
