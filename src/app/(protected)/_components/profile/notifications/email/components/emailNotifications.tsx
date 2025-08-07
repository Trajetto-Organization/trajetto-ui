"use client";

import { Mail, CheckCircle2, XCircle } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { Separator } from "@/components/ui/separator";
import { useEmailNotifications } from "../hooks/useEmailNotifications";

interface EmailNotificationsProps {
  initialEnabled: boolean;
}

const EmailNotifications = ({
  initialEnabled,
}: EmailNotificationsProps): JSX.Element => {
  const { isEnabled, isUpdating, handleToggle } = useEmailNotifications({
    initialEnabled,
  });

  return (
    <div className="space-y-6">
      {/* Header with status badge */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-7 w-7 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold">Notificações por Email</h3>
            <p className="text-sm text-muted-foreground">
              Receba notificações importantes em seu email
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
            isEnabled
              ? "bg-green-600/10 dark:bg-green-600/10 dark:text-green-500 text-green-600"
              : "bg-red-600/10 dark:bg-red-500/10 dark:text-red-500 text-red-600"
          }`}
        >
          <div className="rounded-full p-[2px]">
            {isEnabled ? (
              <CheckCircle2 className="size-3" />
            ) : (
              <XCircle className="size-3" />
            )}
          </div>
          {isEnabled ? "Habilitado" : "Desabilitado"}
        </div>
      </div>

      <Separator />

      {/* Toggle Notifications */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="email-toggle">Receber notificações por email</Label>
          <p className="text-sm text-muted-foreground">
            Ative para receber alertas de multas, ordens de serviços e outras
            notificações importantes
          </p>
        </div>

        <Switch
          id="email-toggle"
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isUpdating}
        />
      </div>
    </div>
  );
};

export { EmailNotifications };
