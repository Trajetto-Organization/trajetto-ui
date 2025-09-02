"use client";

import { useEffect, useState } from "react";
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

import { Bell, Check, Loader, Trash2 } from "lucide-react";
import {
  handleMarkNotificationAsRead,
  handleDeleteNotification,
  handleMarkAllNotificationsAsRead,
} from "@/actions/notifications";

import Link from "next/link";

import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useFormState, useFormStatus } from "react-dom";

import { useNotifications } from "./hooks";
import { toast } from "sonner";

import { useNotificationsContext } from "../layout/protected-provider/notifications-provider";
import { formatNotificationDate } from "@/lib/format-values";

import { ButtonRevalidation } from "../revalidation-button";

interface Notification {
  id: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string | Date;
  type: string;
}

interface NotificationData {
  data: Notification[];
  total: number;
  unread: number;
}

interface NotificationListProps {
  initialData: NotificationData;
  responseError: {
    error: boolean;
    errorMessage: string;
  };
  currentLimit: number;
  currentIncludeRead: boolean;
}

interface NotificationCardProps {
  notification: Notification;
}

function useNotificationStatus() {
  const [isClient, setIsClient] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    NotificationPermission | "unsupported"
  >("default");

  useEffect(() => {
    setIsClient(true);

    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionStatus(Notification.permission);
    } else {
      setPermissionStatus("unsupported");
    }
  }, []);

  const toggleNotifications = async () => {
    if (!isClient || permissionStatus === "unsupported") return;

    if (permissionStatus === "granted") {
      toast.info(
        "Para desativar as notificações, acesse as configurações do seu navegador",
        { duration: 5000 },
      );
      return;
    }

    if (permissionStatus === "denied") {
      toast.error(
        "Permissão para notificações negada. Acesse as configurações do seu navegador para habilitá-lo.",
        { duration: 5000 },
      );

      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === "granted") {
        toast.success("Notificações em tempo real ativadas com sucesso!");
      } else if (permission === "denied") {
        toast.error(
          "Permissão para notificações negada. Acesse as configurações do seu navegador para habilitá-lo.",
        );
      }
    } catch (error) {
      toast.error("Não foi possível ativar as notificações.");
    }
  };

  return { isClient, permissionStatus, toggleNotifications };
}

const MarkAllAsReadButton = ({ disabled }: { disabled: boolean }) => {
  const { pending } = useFormStatus();

  return (
    <Button
      variant="outline"
      size="sm"
      type="submit"
      disabled={disabled || pending}
      className="whitespace-nowrap min-w-max"
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
        }
      }}
    >
      <Check className="h-4 w-4 mr-2 flex-shrink-0" />
      <span className="hidden sm:inline">Marcar todas como lidas</span>
      <span className="inline sm:hidden">Marcar lidas</span>
      {pending && (
        <div className="animate-spin ml-2 flex-shrink-0">
          <Loader className="h-4 w-4" />
        </div>
      )}
    </Button>
  );
};

const MarkAsReadButton = () => {
  const { pending } = useFormStatus();

  return (
    <Button
      size="sm"
      variant="outline"
      type="submit"
      disabled={pending}
      className="whitespace-nowrap"
    >
      <Check className="h-4 w-4 mr-2 flex-shrink-0" />
      <span className="hidden sm:inline">Marcar como lida</span>
      <span className="inline sm:hidden">Lida</span>
      {pending && (
        <div className="animate-spin ml-2 flex-shrink-0">
          <Loader className="h-4 w-4" />
        </div>
      )}
    </Button>
  );
};

const DeleteNotificationButton = () => {
  const { pending } = useFormStatus();

  return (
    <Button
      size="icon"
      variant="ghost"
      type="submit"
      className="h-8 w-8 flex-shrink-0"
      title="Excluir notificação"
      disabled={pending}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
      {pending && (
        <div className="animate-spin mr-1">
          <Loader />
        </div>
      )}
    </Button>
  );
};

const NotificationCard = ({
  notification,
}: NotificationCardProps): JSX.Element => {
  const { markNotificationAsRead, removeNotification } =
    useNotificationsContext();

  const [markAsReadState, markAsReadDispatch] = useFormState(async () => {
    if (!notification.read) {
      const result = await handleMarkNotificationAsRead(notification.id);

      if (result.successMessage) {
        markNotificationAsRead(notification.id);
      }

      return result;
    }
    return null;
  }, null);

  const [deleteState, deleteDispatch] = useFormState(async () => {
    try {
      const result = await handleDeleteNotification(notification.id);

      if (!result.deleteNotificationError) {
        removeNotification(notification.id);

        return {
          ...result,
          successMessage:
            result.successMessage || "Notificação excluída com sucesso!",
        };
      }

      return result;
    } catch (error) {
      return {
        deleteNotificationError:
          "Ocorreu um erro inesperado ao tentar excluir a notificação.",
      };
    }
  }, null);

  useNotifications(markAsReadState || deleteState);

  const formattedDate = formatNotificationDate(
    typeof notification.created_at === "string"
      ? new Date(notification.created_at)
      : notification.created_at,
  );

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
            <form action={markAsReadDispatch}>
              <MarkAsReadButton />
            </form>
          )}
        </div>

        <form action={deleteDispatch}>
          <DeleteNotificationButton />
        </form>
      </CardFooter>
    </Card>
  );
};

const NotificationList = ({
  initialData,
  responseError,
  currentLimit,
  currentIncludeRead,
}: NotificationListProps): JSX.Element => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Notifications status
  const { isClient, permissionStatus, toggleNotifications } =
    useNotificationStatus();

  // Get real-time notifications from context
  const { realtimeNotifications, markAllNotificationsAsRead } =
    useNotificationsContext();

  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState<boolean>(false);

  // Status to track deleted notifications
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Combine bank and real-time notifications, removing duplicates and deleted
  const combinedNotifications = [...realtimeNotifications, ...initialData.data]
    .filter((notification) => !deletedIds.has(notification.id)) // Filter deleted notifications
    .filter(
      (notification, index, self) =>
        index === self.findIndex((n) => n.id === notification.id),
    );

  // Handle marking all as read
  const [markAllAsReadState, markAllAsReadDispatch] = useFormState(async () => {
    setIsMarkingAllAsRead(true);
    return await handleMarkAllNotificationsAsRead();
  }, null);

  useNotifications(markAllAsReadState);

  // Effect for mark all as read
  useEffect(() => {
    if (isMarkingAllAsRead && markAllAsReadState?.successMessage) {
      // Reset flag first
      setIsMarkingAllAsRead(false);
      markAllNotificationsAsRead();

      // Reset deletedIds too
      setDeletedIds(new Set());
    }
  }, [isMarkingAllAsRead, markAllAsReadState, markAllNotificationsAsRead]);

  const updateFilterParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set(key, value);
    router.push(`?${params.toString()}`);
  };

  if (responseError.error) {
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

  // Check if we have the total unread notifications from the server
  const serverUnreadCount = initialData.unread || 0;

  // Calculate the number of real-time notifications that do not exist in the database
  const realtimeOnlyNotifications = realtimeNotifications.filter(
    (rn) => !initialData.data.some((db) => db.id === rn.id) && !rn.read,
  );

  // The actual unread total is the server total + the new ones in real time
  const totalRealUnreadCount =
    serverUnreadCount + realtimeOnlyNotifications.length;

  // Remove those that were deleted locally
  const adjustedUnreadCount =
    totalRealUnreadCount -
    [...deletedIds].filter(
      (id) =>
        // Filters only deleted IDs that match unread notifications
        initialData.data.some((n) => n.id === id && !n.read) ||
        realtimeNotifications.some((n) => n.id === id && !n.read),
    ).length;

  const notificationText =
    adjustedUnreadCount === 0
      ? "0 notificações não lidas"
      : adjustedUnreadCount === 1
        ? "1 notificação não lida"
        : adjustedUnreadCount > currentLimit
          ? `${currentLimit}+ notificações não lidas`
          : `${adjustedUnreadCount} notificações não lidas`;

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
                          text-transparent bg-gradient-to-r from-purple-500 to-pink-500"
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
        <div className="flex items-center gap-2">
          <form action={markAllAsReadDispatch}>
            <MarkAllAsReadButton disabled={totalRealUnreadCount === 0} />
          </form>

          <ButtonRevalidation
            revalidateData={["update-notification"]}
            rateLimit={{
              storageKey: "notification",
              maxClicks: 3,
              timeWindowMs: 30000,
              cooldownTimeMs: 15000,
            }}
          />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="all" className="flex-1 sm:flex-auto">
            Todas
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex-1 sm:flex-auto">
            Não lidas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          {combinedNotifications.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Você não tem notificações.
              </CardContent>
            </Card>
          ) : (
            combinedNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4 mt-4">
          {combinedNotifications.filter((n) => !n.read).length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Você não tem notificações não lidas.
              </CardContent>
            </Card>
          ) : (
            combinedNotifications
              .filter((notification) => !notification.read)
              .map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                />
              ))
          )}
        </TabsContent>
      </Tabs>

      <div
        className="flex flex-col sm:flex-row 
        sm:justify-end gap-4 mt-6"
      >
        <div
          className="flex items-center justify-between 
          sm:justify-start gap-2 w-full sm:w-auto"
        >
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Status:
          </span>
          <Select
            defaultValue={String(currentIncludeRead)}
            onValueChange={(value) => updateFilterParams("includeRead", value)}
          >
            <SelectTrigger className="w-full sm:w-[150px] h-8">
              <SelectValue
                placeholder={currentIncludeRead ? "Todas" : "Apenas não lidas"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Todas</SelectItem>
              <SelectItem value="false">Apenas não lidas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div
          className="flex items-center justify-between 
          sm:justify-start gap-2 w-full sm:w-auto"
        >
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Exibir:
          </span>
          <Select
            defaultValue={String(currentLimit)}
            onValueChange={(value) => updateFilterParams("limit", value)}
          >
            <SelectTrigger className="w-full sm:w-[110px] h-8">
              <SelectValue placeholder={`${currentLimit} itens`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 itens</SelectItem>
              <SelectItem value="20">20 itens</SelectItem>
              <SelectItem value="50">50 itens</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export { NotificationList };
