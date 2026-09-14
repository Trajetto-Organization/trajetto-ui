"use client";

import { Info, AlertTriangle } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/brand";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

import { useWhatsAppSettings } from "./hooks";
import type { WhatsAppSettingsProps } from "../shared/common.types";

const WhatsAppSettings = ({
  userRole,
  driverId,
  initialSettings,
}: WhatsAppSettingsProps): JSX.Element => {
  const isDriver = userRole === "BUSINESS_USER" && !!driverId;

  const {
    settings,
    isUpdating,
    phoneNumber,
    isPhoneModified,
    isPhoneValid,
    handlePhoneChange,
    handleToggleNotifications,
    handleSavePhone,
  } = useWhatsAppSettings({ initialSettings });

  const isEnabled = settings?.enabled || false;
  const isSwitchDisabled = isUpdating || (!isEnabled && !isPhoneValid);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <WhatsappIcon className="h-7 w-7 text-green-500" />
        <div>
          <h3 className="text-lg font-semibold">WhatsApp</h3>
          <p className="text-sm text-muted-foreground">
            Receba notificações importantes diretamente no WhatsApp
          </p>
        </div>
      </div>

      <Separator />

      {/* Phone Setup */}
      <div className="space-y-3">
        <Label htmlFor="phone">
          Número de telefone
          {!isEnabled && (
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
            disabled={isUpdating}
            className="flex-1"
          />

          {isEnabled && isPhoneModified && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSavePhone}
              disabled={isUpdating || !isPhoneValid}
            >
              Salvar número
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Celular: (DDD) 9XXXX-XXXX | Fixo: (DDD) XXXX-XXXX
        </p>
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
          checked={isEnabled}
          onCheckedChange={handleToggleNotifications}
          disabled={isSwitchDisabled}
        />
      </div>

      {/* Server not yet configured for the official Meta Cloud API */}
      {isEnabled && settings && !settings.serviceConfigured && (
        <Alert
          className="bg-amber-50 border-amber-200
          dark:bg-amber-950/20 dark:border-amber-800"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Envio ainda não configurado:</strong> sua preferência foi
            salva, mas as mensagens só começam a chegar quando o serviço de
            WhatsApp for configurado no servidor.
          </AlertDescription>
        </Alert>
      )}

      {/* Invalid phone warning */}
      {!isEnabled && !isPhoneValid && (
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
