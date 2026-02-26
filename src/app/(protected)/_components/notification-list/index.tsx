"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Loader } from "lucide-react";

import {
  handleMarkNotificationAsRead,
  handleDeleteNotification,
} from "@/actions/notifications";

import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Clock, RefreshCw } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useNotificationsContext } from "../layout/protected-provider/notifications-provider";

import {
  NotificationCardProps,
  NotificationListProps,
  Notification,
} from "./dto";

import { DeleteNotificationButton } from "./components/delete-notification-button";
import { MarkAsReadButton } from "./components/mark-read-button";

import { useNotificationStatus } from "./hooks/use-notification-status";
import { useNotificationInfiniteScroll } from "./hooks/notification-infinite-scroll";

import { useDataButtonRevalidation } from "../hooks/revalidation-button";

// ============================================================================
// NOTIFICATION CARD - Receives cache manipulation functions as props
// ============================================================================
interface ExtendedNotificationCardProps extends NotificationCardProps {
  onRemoveFromCache: (id: string) => void;
  onUpdateInCache: (id: string, updates: Partial<Notification>) => void;
}

const NotificationCard = ({
  notification,
  onRemoveFromCache,
  onUpdateInCache,
}: ExtendedNotificationCardProps): JSX.Element => {
  const { markNotificationAsRead, removeNotification } =
    useNotificationsContext();

  const [isMarkingRead, setIsMarkingRead] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleMarkAsRead = async () => {
    if (notification.read || isMarkingRead) return;
    setIsMarkingRead(true);

    try {
      const result = await handleMarkNotificationAsRead(notification.id);

      if (result.successMessage) {
        // Update BOTH sources of truth atomically
        markNotificationAsRead(notification.id);
        onUpdateInCache(notification.id, { read: true });

        toast.success(result.successMessage);
      } else if (result.markAsReadError) {
        toast.error(result.markAsReadError);
      }
    } catch {
      toast.error("Erro ao marcar notificação como lida");
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const result = await handleDeleteNotification(notification.id);

      if (!result.deleteNotificationError) {
        // CRITICAL: Remove from BOTH sources of truth atomically
        // This prevents ghost data resurrection
        removeNotification(notification.id);
        onRemoveFromCache(notification.id);

        toast.success(
          result.successMessage || "Notificação excluída com sucesso!",
        );
      } else {
        toast.error(result.deleteNotificationError);
      }
    } catch {
      toast.error(
        "Ocorreu um erro inesperado ao tentar excluir a notificação.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDate = notification.created_at as string;

  return (
    <Card
      className={
        notification.read
          ? "bg-muted/30"
          : "hover:shadow-lg transition duration-200"
      }
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{notification.title}</CardTitle>
        <CardDescription>{formattedDate}</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-[0.9rem] text-muted-foreground">
          {notification.message}
        </p>
      </CardContent>
      <CardFooter className="pt-0 flex flex-wrap justify-between gap-y-2">
        <div className="flex flex-wrap gap-2">
          {notification.link && (
            <Button
              size="sm"
              variant="default"
              asChild
              className="whitespace-nowrap"
            >
              <Link href={notification.link}>Ver detalhes</Link>
            </Button>
          )}

          {!notification.read && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleMarkAsRead();
              }}
            >
              <MarkAsReadButton disabled={isMarkingRead} />
            </form>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleDelete();
          }}
        >
          <DeleteNotificationButton disabled={isDeleting} />
        </form>
      </CardFooter>
    </Card>
  );
};

// ============================================================================
// NOTIFICATION LIST
// ============================================================================
const NotificationList = ({
  responseError,
}: NotificationListProps): JSX.Element => {
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  // Notifications status (browser permissions)
  const { isClient, permissionStatus, toggleNotifications } =
    useNotificationStatus();

  // Get notifications from context (single source of truth for display)
  const { notifications: contextNotifications, unreadCount } =
    useNotificationsContext();

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
    useDataButtonRevalidation(null, {
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
                        <div className="mr-1.5 h-2 w-2 rounded-full bg-gray-300" />
                        <span className="text-xs font-medium text-gray-500">
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching || isRateLimited}
            className="w-full sm:w-auto"
          >
            {isRateLimited ? (
              <>
                Aguarde {cooldownRemaining}s
                <Clock className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                <RefreshCw
                  className={`h-4 w-4 mr-2 flex-shrink-0 ${isFetching ? "animate-spin" : ""}`}
                />
                Atualizar
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
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
                Revalidar Notificações
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
                Revalidar Notificações
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
