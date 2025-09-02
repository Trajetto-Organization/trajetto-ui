"use client";

import { Card, CardContent } from "@/components/ui/card";

import { WhatsAppConnection } from "./whatsAppConnection";
import { WhatsAppStatus } from "./whatsAppStatus";

import { WhatsAppSettings } from "./whatsAppSettings";
import { UserRole } from "../../../../dto";

interface WhatsAppNotificationsProps {
  error: boolean;
  userRole?: UserRole;
}

const WhatsAppNotifications = ({
  error,
  userRole,
}: WhatsAppNotificationsProps): JSX.Element => {
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Erro ao carregar configurações de notificações do WhatsApp.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Basic Settings (Enable/Disable + Phone) */}
          <WhatsAppSettings userRole={userRole} />

          {/* Connection buttons (QR Code + Pairing Code) */}
          <WhatsAppConnection />

          {/* Connection Status + Progress */}
          <WhatsAppStatus userRole={userRole} />
        </div>
      </CardContent>
    </Card>
  );
};

export { WhatsAppNotifications };
