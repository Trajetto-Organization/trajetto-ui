"use client";

import {
  CheckCircle2,
  MessageSquare,
  Users,
  MessageCircle,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

import { Separator } from "@/components/ui/separator";
import { UserRole } from "@/app/(protected)/_components/shared/common.types";

import type { WhatsAppStatusProps } from "../shared/common.types";
import { useWhatsAppContext } from "../shared/provider";

const WhatsAppStatus = ({
  userRole,
  driverId,
}: WhatsAppStatusProps): JSX.Element | null => {
  const {
    settings,
    syncProgress,
    showSyncProgress,
    showConnectionConfirmation,
  } = useWhatsAppContext();

  // Check if you are a driver
  const isDriver = userRole === "BUSINESS_USER" && !!driverId;

  // Function to get notifications based on user role
  const getNotificationsList = (role?: UserRole) => {
    // Drivers do not receive a list of notifications.
    if (isDriver) {
      return [];
    }

    if (role === "BUSINESS_USER") {
      return ["Alertas de manutenção", "Atualizações importantes do sistema"];
    }

    // For BUSINESS_ADMIN, MASTER, and other roles
    return [
      "Novas multas registradas",
      "Vencimentos de documentos",
      "Alertas de manutenção",
      "Atualizações importantes do sistema",
    ];
  };

  // If it is not enabled, it does not show
  if (!settings?.instanceConnected) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Separator />

      {/* Synchronization Progress */}
      {settings.instanceConnected && syncProgress && showSyncProgress && (
        <div
          className="space-y-3 animate-in 
          fade-in slide-in-from-top-2 duration-300"
        >
          <div
            className="flex items-center 
            justify-between text-sm"
          >
            <span className="text-muted-foreground">
              Sincronizando mensagens...
            </span>
            <span className="font-medium">{syncProgress.progress}%</span>
          </div>

          <Progress value={syncProgress.progress} className="h-2" />

          <div
            className="grid grid-cols-3 
            gap-4 text-center"
          >
            <div className="space-y-1">
              <div
                className="flex items-center 
                justify-center text-muted-foreground"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                <span className="text-xs">Conversas</span>
              </div>
              <p className="text-sm font-medium">
                {syncProgress.chats.toLocaleString()}
              </p>
            </div>

            <div className="space-y-1">
              <div
                className="flex items-center 
                justify-center text-muted-foreground"
              >
                <Users className="h-4 w-4 mr-1" />
                <span className="text-xs">Contatos</span>
              </div>
              <p className="text-sm font-medium">
                {syncProgress.contacts.toLocaleString()}
              </p>
            </div>

            <div className="space-y-1">
              <div
                className="flex items-center 
                justify-center text-muted-foreground"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                <span className="text-xs">Mensagens</span>
              </div>
              <p className="text-sm font-medium">
                {syncProgress.messages.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Confirmation */}
      {settings.instanceConnected && showConnectionConfirmation && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {isDriver ? (
              "WhatsApp conectado com sucesso!"
            ) : (
              <>
                WhatsApp conectado com sucesso! Você receberá notificações
                sobre:
                <ul className="mt-2 ml-4 list-disc text-sm">
                  {getNotificationsList(userRole).map((notification, index) => (
                    <li key={index}>{notification}</li>
                  ))}
                </ul>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export { WhatsAppStatus };
