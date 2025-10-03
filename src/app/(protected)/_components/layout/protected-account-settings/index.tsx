"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";

import { SidebarMenuButton } from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Bell, ChevronsUpDown, User, Loader, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { handleLogoutUser } from "@/actions/logout-user";
import { UserRole } from "../../dto";

import { useProtectedAccountSettings } from "./hooks";

import { useAuthStore } from "@/store/auth-store";
import { useNotificationsContext } from "../protected-provider/notifications-provider";

import { disconnectSocket } from "@/socket";

interface UserLogged {
  email: string;
  name: string;
  role: UserRole;
  avatar?: string | null;
}

interface ProtectedAccountSettingsProps {
  userLogged: UserLogged;
  notificationCount: number;
}

const LogOutUserContainer = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <DropdownMenuItem
      asChild
      className="cursor-pointer disabled:cursor-not-allowed"
      disabled={pending}
      onSelect={(event) => event.preventDefault()}
    >
      <button
        type="submit"
        className="w-full flex items-center justify-start 
        cursor-pointer disabled:cursor-not-allowed"
      >
        {pending ? (
          <div className="animate-spin mr-3">
            <Loader />
          </div>
        ) : (
          <Lock className="w-4 h-4 mr-3" />
        )}
        Sair
      </button>
    </DropdownMenuItem>
  );
};

const ProtectedAccountSettings = ({
  userLogged,
  notificationCount = 0,
}: ProtectedAccountSettingsProps): JSX.Element => {
  const [state, dispatch] = useFormState(async () => {
    // IMMEDIATE logout - don't wait for anything
    useAuthStore.getState().logout();

    // Fire and forget operations (no waiting to complete)
    Promise.resolve().then(() => {
      disconnectSocket();
      handleLogoutUser().catch(() => {}); // Ignores errors
    });

    // Redirects immediately
    return null;
  }, null);

  // Get real-time notification count and deleted notifications
  const { unreadCount, deletedNotifications } = useNotificationsContext();

  // Calculate how many deleted notifications were unread from server
  const deletedUnreadCount = deletedNotifications.size;

  // Adjust total count: server count + realtime count - deleted count
  const totalNotificationCount = Math.max(
    0,
    notificationCount + unreadCount - deletedUnreadCount,
  );

  useProtectedAccountSettings(state);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild data-tutorial="account">
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent 
          data-[state=open]:text-sidebar-accent-foreground"
        >
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage
              src={userLogged.avatar as string}
              alt={"avatar_image"}
            />
            <AvatarFallback className="rounded-lg">
              {userLogged.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{userLogged.name}</span>
            <span className="truncate text-xs">{userLogged.email}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] 
        min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div
            className="flex items-center gap-2 px-1 
            py-1.5 text-left text-sm"
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage
                src={userLogged.avatar as string}
                alt={"avatar_image"}
              />
              <AvatarFallback className="rounded-lg">
                {userLogged.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{userLogged.name}</span>
              <span className="truncate text-xs">{userLogged.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/profile">
              <User className="mr-3" />
              Minha Conta
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer relative">
            <Link href="/notifications">
              <Bell className="mr-3" />
              Notificações
              {totalNotificationCount > 0 && (
                <span
                  className="absolute right-2 top-1/2 -translate-y-1/2 
                  flex h-5 min-w-5 px-1.5 items-center justify-center 
                  rounded-full bg-[#f50057] text-xs text-white"
                >
                  {totalNotificationCount > 9 ? "9+" : totalNotificationCount}
                </span>
              )}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={dispatch}>
          <LogOutUserContainer />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { ProtectedAccountSettings };
