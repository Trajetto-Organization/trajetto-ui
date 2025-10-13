"use client";

import { useCallback } from "react";

import { Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { Switch } from "@/components/ui/switch";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

import { useWhatsAppSettings } from "../hooks/useWhatsAppSettings";
import { useWhatsAppContext } from "../provider";

import { useWhatsAppConnection } from "../hooks/useWhatsAppConnection";
import { useWhatsAppGlobalEvents } from "../hooks/useWhatsAppGlobalEvents";

import { UserRole } from "../../../../dto";

interface WhatsAppSettingsProps {
  userRole?: UserRole;
  driverId?: string | null;
}

const WhatsAppSettings = ({
  userRole,
  driverId,
}: WhatsAppSettingsProps): JSX.Element => {
  // Verifica se é motorista
  const isDriver = userRole === "BUSINESS_USER" && !!driverId;
  const { settings, updateSettings } = useWhatsAppContext();

  // Get status of active operations
  const { isAnyOperationActive } = useWhatsAppConnection();

  // Memoize callback to avoid infinite loop
  const handleWhatsAppDisabled = useCallback(
    (data: any) => {
      if (settings && settings.enabled) {
        const updatedSettings = {
          ...settings,
          enabled: false,
          instanceConnected: false,
        };
        updateSettings(updatedSettings);
      }
    },
    [settings, updateSettings],
  );

  // Listen to global events for auto-disable
  useWhatsAppGlobalEvents({
    onWhatsAppDisabled: handleWhatsAppDisabled,
  });

  const {
    isUpdating,
    phoneNumber,
    handlePhoneChange,
    handleToggleNotifications,
  } = useWhatsAppSettings({
    initialSettings: settings,
    isAnyOperationActive,
  });

  // Phone validation
  const cleanedPhone = phoneNumber.replace(/\D/g, "");
  const isPhoneValid = cleanedPhone.length === 10 || cleanedPhone.length === 11;

  const canEnableNotifications = isPhoneValid;

  // Determine whether fields should be disabled
  const isNotificationsEnabled = settings?.enabled || false;
  const isPhoneInputDisabled =
    isUpdating || isNotificationsEnabled || isAnyOperationActive;
  const isSwitchDisabled =
    isUpdating ||
    (!settings?.enabled && !canEnableNotifications) ||
    isAnyOperationActive;

  /**
   * 🔄 Handler for toggle
   */
  const onToggleNotifications = async (enabled: boolean) => {
    await handleToggleNotifications(enabled, (newSettings) => {
      updateSettings(newSettings);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <FaWhatsapp className="h-7 w-7 text-green-500" />
          <div>
            <h3 className="text-lg font-semibold">WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              Receba notificações importantes diretamente no WhatsApp
            </p>
          </div>
        </div>

        {settings?.enabled && (
          <div
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
              settings.instanceConnected
                ? "bg-green-600/10 dark:bg-green-600/10 dark:text-green-500 text-green-600"
                : "bg-red-600/10 dark:bg-red-500/10 dark:text-red-500 text-red-600"
            }`}
          >
            <div className="rounded-full p-[2px]">
              {settings.instanceConnected ? (
                <CheckCircle2 className="size-3" />
              ) : (
                <XCircle className="size-3" />
              )}
            </div>
            {settings.instanceConnected ? "Conectado" : "Desconectado"}
          </div>
        )}
      </div>

      <Separator />

      {/* Phone Setup */}
      <div className="space-y-3">
        <Label htmlFor="phone">
          Número de telefone
          {!settings?.enabled && (
            <span
              className="text-xs 
              text-muted-foreground 
              ml-1"
            >
              (obrigatório)
            </span>
          )}
        </Label>

        <div className="flex gap-2">
          <Input
            id="phone"
            type="tel"
            placeholder="(11) 98765-4321"
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            disabled={isPhoneInputDisabled}
            className="flex-1"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Celular: (DDD) 9XXXX-XXXX | Fixo: (DDD) XXXX-XXXX
        </p>

        {/* Notice when notifications are enabled */}
        {isNotificationsEnabled && (
          <Alert
            className="bg-amber-50 border-amber-200 
            dark:bg-amber-950/20 dark:border-amber-800"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Para alterar o número:</strong> Primeiro desabilite as
              notificações WhatsApp, altere o número e depois reabilite as
              notificações.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Separator />

      {/* Toggle Notifications */}
      <div
        className="flex items-center 
        justify-between"
      >
        <div className="space-y-0.5">
          <Label htmlFor="whatsapp-toggle">Notificações WhatsApp</Label>
          <p className="text-sm text-muted-foreground">
            {isDriver
              ? "Ative para receber notificações importantes do sistema"
              : userRole === "BUSINESS_USER"
                ? "Ative para receber alertas de ordens de serviços e outras notificações importantes"
                : "Ative para receber alertas de multas, ordens de serviços e outras notificações importantes"}
          </p>
        </div>

        <Switch
          id="whatsapp-toggle"
          checked={settings?.enabled || false}
          onCheckedChange={onToggleNotifications}
          disabled={isSwitchDisabled}
        />
      </div>

      {/* Notification when there are active operations */}
      {isAnyOperationActive && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Operação em andamento:</strong> Aguarde a conclusão para
            fazer alterações nas configurações.
          </AlertDescription>
        </Alert>
      )}

      {/* Invalid phone warning */}
      {!settings?.enabled && !canEnableNotifications && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Digite um número de telefone válido antes de habilitar as
            notificações
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export { WhatsAppSettings };
