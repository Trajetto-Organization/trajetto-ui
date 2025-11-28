"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

import {
  WhatsAppSettings,
  UpdateWhatsAppSettingsRequest,
  UseWhatsAppSettingsReturn,
  UseWhatsAppSettingsProps,
} from "../dto";

import { updateWhatsAppSettings } from "@/actions/whatsapp/whatsapp-settings";
import { useWhatsAppContext } from "../provider";

function useWhatsAppSettings({
  initialSettings,
  isAnyOperationActive = false, // Parameter for active operations
}: UseWhatsAppSettingsProps): UseWhatsAppSettingsReturn {
  // Use context to control updating state globally
  const { setUpdatingSettings } = useWhatsAppContext();

  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState(
    initialSettings?.phoneNumber || "",
  );

  const [isPhoneModified, setIsPhoneModified] = useState<boolean>(false);

  // Save the initial number for comparison
  const initialPhoneNumber = initialSettings?.phoneNumber || "";

  /**
   * Combined updating state management
   */
  const setUpdatingState = useCallback(
    (updating: boolean) => {
      setIsUpdating(updating);
      setUpdatingSettings(updating); // Also update global state
    },
    [setUpdatingSettings],
  );

  /**
   * 📱 Format phone number
   */
  const formatPhoneNumber = (value: string): string => {
    const numbers = value.replace(/\D/g, "");

    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    } else if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }

    const truncated = numbers.slice(0, 11);
    return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 7)}-${truncated.slice(7)}`;
  };

  /**
   * 🧹 Clear phone number
   */
  const cleanPhoneNumber = (formatted: string): string => {
    return formatted.replace(/\D/g, "");
  };

  /**
   * 📝 Handler for changing phone
   */
  const handlePhoneChange = useCallback(
    (value: string) => {
      // ✅ Prevent alteration if notifications are enabled OR if any operation is active
      if (initialSettings?.enabled || isAnyOperationActive) {
        if (initialSettings?.enabled) {
          toast.warning(
            "Desabilite as notificações primeiro para alterar o número",
          );
        } else if (isAnyOperationActive) {
          toast.warning(
            "Aguarde a conclusão da operação atual para alterar o número",
          );
        }
        return;
      }

      const formattedValue = formatPhoneNumber(value);
      setPhoneNumber(formattedValue);

      const cleanedValue = cleanPhoneNumber(formattedValue);
      const cleanedInitial = cleanPhoneNumber(initialPhoneNumber);

      setIsPhoneModified(cleanedValue !== cleanedInitial);
    },
    [initialPhoneNumber, initialSettings?.enabled, isAnyOperationActive],
  );

  /**
   * 🔄 Handler for notification toggle with improved timing
   */
  const handleToggleNotifications = useCallback(
    async (enabled: boolean, onSuccess?: (data: WhatsAppSettings) => void) => {
      // ✅ NOVO: Bloquear se há operação ativa
      if (isAnyOperationActive) {
        toast.warning("Aguarde a conclusão da operação atual");
        return;
      }

      setUpdatingState(true);

      try {
        // ✅ If enabling, use current phone number
        // If disabling, keep existing number
        const phoneToUse = enabled
          ? cleanPhoneNumber(phoneNumber)
          : initialSettings?.phoneNumber;

        const requestData: UpdateWhatsAppSettingsRequest = {
          whatsapp_notifications_enabled: enabled,
          whatsapp_phone: enabled ? phoneToUse : undefined,
        };

        const result = await updateWhatsAppSettings(requestData);

        if (result.success && result.data) {
          const message = enabled
            ? "WhatsApp habilitado com sucesso!"
            : "WhatsApp desabilitado com sucesso! Agora você pode alterar o número.";

          toast.success(message);

          // ✅ Reset modification state when disabling
          if (!enabled) {
            setIsPhoneModified(false);
          }

          onSuccess?.(result.data);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error(
          "Houve um erro inesperado ao tentar atualizar as configurações!",
        );
      } finally {
        // ✅ MELHORADO: Add delay before clearing updating state for phone changes
        const isPhoneChanging =
          cleanPhoneNumber(phoneNumber) !==
          cleanPhoneNumber(initialPhoneNumber);
        const delay = enabled && isPhoneChanging ? 5000 : 1000; // 5s for phone changes, 1s for normal

        setTimeout(() => {
          setUpdatingState(false);
        }, delay);
      }
    },
    [
      phoneNumber,
      initialSettings?.phoneNumber,
      initialPhoneNumber,
      setUpdatingState,
      isAnyOperationActive,
    ],
  );

  /**
   * 💾 Handler to update phone
   */
  const handleUpdatePhone = useCallback(
    async (onSuccess?: (data: WhatsAppSettings) => void) => {
      // Check if notifications are enabled OR if any operation is active
      if (initialSettings?.enabled) {
        toast.error(
          "Desabilite as notificações primeiro para alterar o número",
        );
        return;
      }

      if (isAnyOperationActive) {
        toast.warning("Aguarde a conclusão da operação atual");
        return;
      }

      if (!phoneNumber.trim()) {
        toast.error("Digite um número de telefone");
        return;
      }

      const cleanedPhone = cleanPhoneNumber(phoneNumber);

      if (cleanedPhone.length < 10 || cleanedPhone.length > 11) {
        toast.error("Número de telefone inválido");
        return;
      }

      setUpdatingState(true);

      try {
        const requestData: UpdateWhatsAppSettingsRequest = {
          whatsapp_notifications_enabled: false, // Ensure it's disabled
          whatsapp_phone: cleanedPhone,
        };

        const result = await updateWhatsAppSettings(requestData);

        if (result.success && result.data) {
          toast.success(
            "Número atualizado com sucesso! Agora você pode reabilitar as notificações.",
          );

          setIsPhoneModified(false);
          onSuccess?.(result.data);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error("Erro inesperado ao atualizar número");
      } finally {
        setTimeout(() => {
          setUpdatingState(false);
        }, 1000);
      }
    },
    [
      phoneNumber,
      initialSettings?.enabled,
      setUpdatingState,
      isAnyOperationActive,
    ],
  );

  return {
    isUpdating,
    phoneNumber,
    isPhoneModified,
    handlePhoneChange,
    handleToggleNotifications,
    handleUpdatePhone,
  };
}

export { useWhatsAppSettings };
