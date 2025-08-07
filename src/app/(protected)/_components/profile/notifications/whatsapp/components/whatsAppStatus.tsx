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

import { useWhatsAppContext } from "../provider";

const WhatsAppStatus = (): JSX.Element | null => {
  const {
    settings,
    syncProgress,
    showSyncProgress,
    showConnectionConfirmation,
  } = useWhatsAppContext();

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
            WhatsApp conectado com sucesso! Você receberá notificações sobre:
            <ul className="mt-2 ml-4 list-disc text-sm">
              <li>Novas multas registradas</li>
              <li>Vencimentos de documentos</li>
              <li>Alertas de manutenção</li>
              <li>Atualizações importantes do sistema</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export { WhatsAppStatus };
