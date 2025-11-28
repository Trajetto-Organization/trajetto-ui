"use client";

import { Activity, CheckCircle2, XCircle } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { Separator } from "@/components/ui/separator";
import { useActivityNotifications } from "../hooks/useActivityNotifications";

import { ActivityNotificationsProps } from "../dto";

const ActivityNotifications = ({
  initialEnabled,
}: ActivityNotificationsProps): JSX.Element => {
  const { isEnabled, isUpdating, handleToggle } = useActivityNotifications({
    initialEnabled,
  });

  return (
    <div className="space-y-6">
      {/* Header with status badge */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-7 w-7 text-orange-500" />
          <div>
            <h3 className="text-lg font-semibold">Registro de Atividades</h3>
            <p className="text-sm text-muted-foreground">
              Receba notificações sobre atividades e mudanças no sistema
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div
          className={`flex items-center gap-1 
          rounded-md px-2 py-1 text-xs font-medium ${
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
          <Label htmlFor="activity-toggle">
            Receber notificações de atividade
          </Label>
          <p className="text-sm text-muted-foreground">
            Ative para receber alertas sobre criação, edição e exclusão de dados
            no sistema
          </p>
        </div>

        <Switch
          id="activity-toggle"
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isUpdating}
        />
      </div>
    </div>
  );
};

export { ActivityNotifications };
