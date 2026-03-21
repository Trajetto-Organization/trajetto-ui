import { useState } from "react";

import Link from "next/link";
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

import {
  handleMarkNotificationAsRead,
  handleDeleteNotification,
} from "@/actions/notifications";

import { DeleteNotificationButton } from "../delete-notification-button";
import { MarkAsReadButton } from "../mark-read-button";

import type { ExtendedNotificationCardProps } from "../notification-list.types";
import { useNotificationsContext } from "../../layout/protected-provider/notifications-provider";

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

export { NotificationCard };
