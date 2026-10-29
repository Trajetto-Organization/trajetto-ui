"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

import type {
  WhatsAppSettings,
  UpdateWhatsAppSettingsRequest,
  UseWhatsAppSettingsReturn,
  UseWhatsAppSettingsProps,
} from "../../shared/common.types";

import { updateWhatsAppSettings } from "@/actions/whatsapp/whatsapp-settings";
import { isStaleActionResult } from "@/lib/action-result";

function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }

  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
}

function cleanPhoneNumber(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

/**
 * State for the WhatsApp opt-in card.
 *
 * Local state is all it takes now: there is no pairing, no connection status
 * and no cross-component coordination — the Meta Cloud API needs only the
 * recipient's number, so changing it is a plain save even while enabled.
 */
function useWhatsAppSettings({
  initialSettings,
}: UseWhatsAppSettingsProps): UseWhatsAppSettingsReturn {
  const [settings, setSettings] = useState<WhatsAppSettings | null>(
    initialSettings,
  );

  const [isUpdating, setIsUpdating] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(
    initialSettings?.phoneNumber
      ? formatPhoneNumber(initialSettings.phoneNumber)
      : "",
  );

  const cleanedPhone = cleanPhoneNumber(phoneNumber);
  const isPhoneValid = cleanedPhone.length === 10 || cleanedPhone.length === 11;

  const isPhoneModified =
    cleanedPhone !== cleanPhoneNumber(settings?.phoneNumber || "");

  const handlePhoneChange = useCallback((value: string) => {
    setPhoneNumber(formatPhoneNumber(value));
  }, []);

  const submitSettings = useCallback(
    async (requestData: UpdateWhatsAppSettingsRequest, message: string) => {
      setIsUpdating(true);

      try {
        const result = await updateWhatsAppSettings(requestData);

        if (isStaleActionResult(result)) return;

        if (result.success && result.data) {
          setSettings(result.data);

          if (result.data.phoneNumber) {
            setPhoneNumber(formatPhoneNumber(result.data.phoneNumber));
          }

          toast.success(message);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error(
          "Houve um erro inesperado ao tentar atualizar as configurações!",
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [],
  );

  const handleToggleNotifications = useCallback(
    async (enabled: boolean) => {
      if (enabled && !isPhoneValid) {
        toast.error("Digite um número de telefone válido");
        return;
      }

      await submitSettings(
        {
          whatsapp_notifications_enabled: enabled,
          whatsapp_phone: enabled ? cleanedPhone : undefined,
        },
        enabled
          ? "WhatsApp habilitado com sucesso!"
          : "WhatsApp desabilitado com sucesso!",
      );
    },
    [cleanedPhone, isPhoneValid, submitSettings],
  );

  const handleSavePhone = useCallback(async () => {
    // Only reachable while enabled: with notifications off, the typed number
    // simply rides along on the next enable — the API keeps the stored number
    // untouched on disable requests.
    if (!settings?.enabled) return;

    if (!isPhoneValid) {
      toast.error("Número de telefone inválido");
      return;
    }

    await submitSettings(
      {
        whatsapp_notifications_enabled: true,
        whatsapp_phone: cleanedPhone,
      },
      "Número atualizado com sucesso!",
    );
  }, [cleanedPhone, isPhoneValid, settings?.enabled, submitSettings]);

  return {
    settings,
    isUpdating,
    phoneNumber,
    isPhoneModified,
    isPhoneValid,
    handlePhoneChange,
    handleToggleNotifications,
    handleSavePhone,
  };
}

export { useWhatsAppSettings };
