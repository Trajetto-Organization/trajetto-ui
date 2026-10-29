"use client";

import { AlertTriangle } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/brand";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

import { useState } from "react";
import { flushSync } from "react-dom";

import { useAuthStore } from "@/store/auth-store";
import { updateWhatsAppSettingsSchema } from "@/schemas/phone-validation-schema";
import { cn } from "@/lib/utils";
import { useLiveValidation } from "@/components/shared/live-validation";

import { whatsAppToggleCopy } from "../../preferences/module-rules";
import { useWhatsAppSettings } from "./hooks";
import type { WhatsAppSettingsProps } from "../shared/common.types";

/**
 * The number's problem, from the action's own schema. The number is optional
 * while notifications stay off (the server accepts it empty); it is required
 * only to turn them on or while they are on.
 */
function whatsAppPhoneIssue(
  formatted: string,
  required: boolean,
): string | null {
  const result = updateWhatsAppSettingsSchema.safeParse({
    whatsapp_notifications_enabled: required,
    whatsapp_phone: formatted,
  });

  return result.success ? null : (result.error.issues[0]?.message ?? null);
}

const WhatsAppSettings = ({
  userRole,
  driverId,
  initialSettings,
}: WhatsAppSettingsProps): JSX.Element => {
  const isDriver = userRole === "BUSINESS_USER" && !!driverId;
  const enabledModules = useAuthStore((state) => state.enabledModules);

  const {
    settings,
    isUpdating,
    phoneNumber,
    isPhoneModified,
    handlePhoneChange,
    handleToggleNotifications,
    handleSavePhone,
  } = useWhatsAppSettings({ initialSettings });

  const isEnabled = settings?.enabled || false;

  // Live validation (decision 16.700): the number is checked once it is
  // left, then as it is typed. Turning the switch on with no valid number
  // says why under the field and focuses it, instead of a switch that is
  // simply off-limits (decision 16.701).
  // Set once the person tries to turn notifications on: from then on an
  // empty number is a missing one. Before that, leaving it empty is fine.
  const [wantsEnabled, setWantsEnabled] = useState(false);
  const numberRequired = isEnabled || wantsEnabled;

  const live = useLiveValidation({
    values: { phone: phoneNumber },
    rules: () => ({ phone: whatsAppPhoneIssue(phoneNumber, numberRequired) }),
    validateOnSubmit: false,
  });
  const phoneMessage = live.messageOf("phone");

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      // Committed before validating, so validate() reads the rule that
      // requires the number (it reads the latest render).
      if (!wantsEnabled) flushSync(() => setWantsEnabled(true));
      if (!live.validate(["phone"])) return;
    }

    void handleToggleNotifications(enabled);
  };

  const handleSave = () => {
    if (!live.validate(["phone"])) return;

    void handleSavePhone();
  };

  return (
    <div ref={live.ref} className="space-y-6">
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
              (necessário para ativar)
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
            aria-invalid={phoneMessage ? true : undefined}
            aria-describedby={
              phoneMessage ? "phone-error phone-hint" : "phone-hint"
            }
            className={cn(
              "flex-1",
              phoneMessage && "border-red-600 dark:border-red-500",
            )}
          />

          {isEnabled && isPhoneModified && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSave}
              disabled={isUpdating}
            >
              Salvar número
            </Button>
          )}
        </div>

        {phoneMessage && (
          <p
            id="phone-error"
            role="alert"
            className="text-xs leading-4 text-destructive"
          >
            {phoneMessage}
          </p>
        )}

        <p id="phone-hint" className="text-xs text-muted-foreground">
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
            {whatsAppToggleCopy(userRole, isDriver, enabledModules)}
          </p>
        </div>

        <Switch
          id="whatsapp-toggle"
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isUpdating}
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
    </div>
  );
};

export { WhatsAppSettings, whatsAppPhoneIssue };
