"use client";

import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { RevalidateButtonUI } from "@/app/(protected)/_components/shared/revalidate-button-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, Loader } from "lucide-react";

import { toast } from "sonner";
import { handleMarkAllNotificationsAsRead } from "@/actions/notifications";
import { isStaleActionResult } from "@/lib/action-result";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useNotificationsContext } from "../layout/protected-provider/notifications-provider";
import { useNotificationStatus } from "./hooks/notification-status";

import { useNotificationInfiniteScroll } from "./hooks/notification-infinite-scroll";
import { NotificationCard } from "./notification-card";

import type { NotificationListProps } from "./notification-list.types";

import { useButtonRefreshRateLimit } from "../hooks/revalidation-button";
import { useNotifications } from "./hooks";

// ============================================================================
// NOTIFICATION LIST
// ============================================================================
const NotificationList = ({
  responseError,
}: NotificationListProps): JSX.Element => {
  const { showSpinner, setShowSpinner } = useNotifications();

  // Notifications status (browser permissions)
  const { isClient, permissionStatus, toggleNotifications } =
    useNotificationStatus();

  // Get notifications from context (single source of truth for display)
  const {
    notifications: contextNotifications,
    unreadCount,
    markAllNotificationsAsRead,
  } = useNotificationsContext();

  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Infinite scroll hook - fetches data and syncs with context
  const {
    notifications: scrollNotifications,
    lastElementRef,
    isFetching,
    isLoading,
    hasError,
    errorMessage,
    refetch,
    removeFromCache,
    updateInCache,
  } = useNotificationInfiniteScroll(true);

  // Rate limiter for refresh button
  const { isRateLimited, cooldownRemaining, registerClick } =
    useButtonRefreshRateLimit({
      maxClicks: 3,
      timeWindowMs: 30000,
      cooldownTimeMs: 15000,
      storageKey: "notification-revalidation",
    });

  const [activeTab, setActiveTab] = useState<string>("all");

  // ============================================================================
  // LOADING SPINNER LOGIC (same as search-business)
  // ============================================================================
  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    if (isLoading || isFetching) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [isLoading, isFetching, hasError]);

  // ============================================================================
  // DISPLAY NOTIFICATIONS - UNIFIED SOURCE OF TRUTH
  // Context is the primary source, but we always show what's available
  // ============================================================================
  // CRITICAL FIX: Always prefer context as it has the most up-to-date state
  // Only fall back to scrollNotifications during initial load
  const displayNotifications =
    contextNotifications.length > 0 || !isLoading
      ? contextNotifications
      : scrollNotifications;

  // Filter for unread tab
  const unreadNotifications = displayNotifications.filter((n) => !n.read);

  // ============================================================================
  // REFRESH WITH RATE LIMITING
  // ============================================================================
  const handleRefresh = () => {
    const canProceed = registerClick();
    if (!canProceed) return;

    refetch();
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  if (responseError.error && !scrollNotifications.length && !hasError) {
    return (
      <div className="space-y-4 my-9">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{responseError.errorMessage}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Notification count text
  const notificationText =
    unreadCount === 0
      ? "0 notificações não lidas"
      : unreadCount === 1
        ? "1 notificação não lida"
        : `${unreadCount} notificações não lidas`;

  return (
    <div className="space-y-4 my-9">
      <div className="flex flex-wrap justify-between items-center gap-y-3">
        <div className="flex items-center gap-2 min-w-[140px]">
          <Bell className="h-5 w-5 flex-shrink-0" color="url(#bellGradient)" />
          <svg width="0" height="0">
            <linearGradient id="bellGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f50057" />
              <stop offset="100%" stopColor="#a374e0" />
            </linearGradient>
          </svg>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {notificationText}
          </span>

          {isClient && permissionStatus !== "unsupported" && (
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleNotifications}
                    data-tutorial="notifications-realtime"
                    className="ml-2 h-7 px-2 whitespace-nowrap rounded-full bg-gradient-to-r
                    from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100
                    transition-all duration-300 border border-purple-200"
                  >
                    {permissionStatus === "granted" ? (
                      <>
                        <div
                          className="mr-1.5 h-2 w-2 rounded-full
                          bg-green-400 animate-pulse"
                        />
                        <span
                          className="text-xs font-medium bg-clip-text
                          text-transparent bg-gradient-to-r
                          from-purple-500 to-pink-500"
                        >
                          Ativo
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="mr-1.5 h-2 w-2 rounded-full bg-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          Tempo real
                        </span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {permissionStatus === "granted"
                    ? "Desativar notificações em tempo real"
                    : "Ativar notificações em tempo real"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div
          className="flex flex-col sm:flex-row items-stretch
          sm:items-center gap-2 w-full sm:w-auto"
        >
          {/* The page-action size (h-9, decision 16.61), like Atualizar beside it. */}
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="w-full sm:w-auto"
            data-tutorial="notifications-mark-all"
            disabled={unreadCount === 0 || isMarkingAll}
            onClick={async () => {
              if (isMarkingAll) return;
              setIsMarkingAll(true);

              try {
                const result = await handleMarkAllNotificationsAsRead();

                if (isStaleActionResult(result)) return;

                if (result.successMessage) {
                  // Both sources of truth: the realtime context and the
                  // page's own scroll cache (via refetch).
                  markAllNotificationsAsRead();
                  refetch();

                  toast.success(result.successMessage);
                } else if (result.markAllError) {
                  toast.error(result.markAllError);
                }
              } finally {
                setIsMarkingAll(false);
              }
            }}
          >
            <CheckCheck aria-hidden="true" className="h-4 w-4" />
            {isMarkingAll ? "Marcando..." : "Marcar todas como lidas"}
          </Button>

          <RevalidateButtonUI
            isLoading={isFetching}
            isRateLimited={isRateLimited}
            cooldownRemaining={cooldownRemaining}
            className="w-full sm:w-auto"
            onClick={handleRefresh}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className="w-full sm:w-auto"
          data-tutorial="notifications-tabs"
        >
          <TabsTrigger value="all" className="flex-1 sm:flex-auto">
            Todas
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex-1 sm:flex-auto">
            Não lidas ({unreadCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          {/* Error state */}
          {hasError && (
            <div
              className="flex flex-col items-center 
              justify-center py-8 text-center"
            >
              <p className="text-muted-foreground mb-2">
                {errorMessage || "Erro ao carregar as notificações"}
              </p>
              <Button
                className="h-8 mt-2"
                variant="outline"
                type="button"
                onClick={() => refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Notifications list */}
          {!hasError &&
            displayNotifications.map((notification) => (
              <div key={notification.id} ref={lastElementRef}>
                <NotificationCard
                  notification={notification}
                  onRemoveFromCache={removeFromCache}
                  onUpdateInCache={updateInCache}
                />
              </div>
            ))}

          {/* Loading skeleton when fetching more */}
          {isFetching && displayNotifications.length > 0 && !hasError && (
            <Skeleton className="w-full h-32" />
          )}

          {/* Initial loading spinner */}
          {showSpinner && !displayNotifications.length && !hasError && (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <Loader className="animate-spin h-6 w-6 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Carregando notificações...
                </span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading &&
            !isFetching &&
            !hasError &&
            displayNotifications.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Você não tem notificações.
                </CardContent>
              </Card>
            )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4 mt-4">
          {/* Error state */}
          {hasError && (
            <div
              className="flex flex-col items-center 
              justify-center py-8 text-center"
            >
              <p className="text-muted-foreground mb-2">
                {errorMessage || "Erro ao carregar as notificações"}
              </p>
              <Button
                className="h-8 mt-2"
                variant="outline"
                type="button"
                onClick={() => refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Unread notifications list */}
          {!hasError &&
            unreadNotifications.map((notification) => (
              <div key={notification.id} ref={lastElementRef}>
                <NotificationCard
                  notification={notification}
                  onRemoveFromCache={removeFromCache}
                  onUpdateInCache={updateInCache}
                />
              </div>
            ))}

          {/* Loading skeleton when fetching more */}
          {isFetching && unreadNotifications.length > 0 && !hasError && (
            <Skeleton className="w-full h-32" />
          )}

          {/* Initial loading spinner */}
          {showSpinner && !unreadNotifications.length && !hasError && (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <Loader className="animate-spin h-6 w-6 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Carregando notificações...
                </span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading &&
            !isFetching &&
            !hasError &&
            unreadNotifications.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Você não tem notificações não lidas.
                </CardContent>
              </Card>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { NotificationList };
