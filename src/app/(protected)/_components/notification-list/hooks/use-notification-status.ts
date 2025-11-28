import { useEffect, useState } from "react";

import { toast } from "sonner";

function useNotificationStatus() {
  const [isClient, setIsClient] = useState<boolean>(false);
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

export { useNotificationStatus };
