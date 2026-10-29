"use client";

import { Card, CardContent } from "@/components/ui/card";

import type { WhatsAppNotificationsProps } from "../shared/common.types";
import { WhatsAppSettings } from "../whatsapp-settings";

const WhatsAppNotifications = ({
  error,
  userRole,
  driverId,
  initialSettings,
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
        <WhatsAppSettings
          userRole={userRole}
          driverId={driverId}
          initialSettings={initialSettings}
        />
      </CardContent>
    </Card>
  );
};

export { WhatsAppNotifications };
