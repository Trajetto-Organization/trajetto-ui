"use client";

import Link from "next/link";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useEffect, useRef } from "react";

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

import { logOutUser, useProtectedAccountSettings } from "./hooks";

import type { ProtectedAccountSettingsProps } from "./protected-account-settings.types";
import { useNotificationsContext } from "../protected-provider/notifications-provider";
import { NOTIFICATION_ACCENT_CLASS } from "../../shared/notification-visuals";
import { cn } from "@/lib/utils";
import { ProtectedAccountThemeMenu } from "../protected-theme-switch";

const LogOutUserContainer = ({
  onPendingChange,
}: {
  onPendingChange: (pending: boolean) => void;
}): JSX.Element => {
  const { pending } = useFormStatus();
  const prevPendingRef = useRef(pending);

  useEffect(() => {
    if (prevPendingRef.current !== pending) {
      onPendingChange(pending);
      prevPendingRef.current = pending;
    }
  }, [pending, onPendingChange]);

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
        disabled={pending}
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
}: ProtectedAccountSettingsProps): JSX.Element => {
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [state, dispatch] = useFormState(logOutUser, null);

  const handlePendingChange = (pending: boolean) => {
    setIsLoggingOut(pending);
  };

  // Get notification count directly from context (single source of truth)
  const { unreadCount } = useNotificationsContext();
  useProtectedAccountSettings(state);

  return (
    <DropdownMenu open={isLoggingOut ? true : undefined}>
      <DropdownMenuTrigger
        asChild
        data-tutorial="account"
        disabled={isLoggingOut}
      >
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent
          data-[state=open]:text-sidebar-accent-foreground"
          disabled={isLoggingOut}
        >
          {/* Decorative: the name is printed right beside it, so a named
              image would make a screen reader say it twice. */}
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={userLogged.avatar as string} alt="" />
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
              <AvatarImage src={userLogged.avatar as string} alt="" />
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
          <DropdownMenuItem
            asChild
            className="cursor-pointer"
            disabled={isLoggingOut}
          >
            <Link href="/profile">
              <User className="mr-3" />
              Minha Conta
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className="cursor-pointer relative"
            disabled={isLoggingOut}
          >
            <Link href="/notifications">
              <Bell className="mr-3" />
              Notificações
              {unreadCount > 0 && (
                <span
                  className={cn(
                    `absolute right-2 top-1/2 -translate-y-1/2
                    flex h-5 min-w-5 px-1.5 items-center justify-center
                    rounded-full text-xs text-white`,
                    // The bell's accent: white on the old #f50057 was 4.18:1.
                    NOTIFICATION_ACCENT_CLASS,
                  )}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </DropdownMenuItem>
          <ProtectedAccountThemeMenu disabled={isLoggingOut} />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={dispatch}>
          <LogOutUserContainer onPendingChange={handlePendingChange} />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { ProtectedAccountSettings };
