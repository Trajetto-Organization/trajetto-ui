"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

import type {
  ConnectionInfo,
  UseWhatsAppStatusReturn,
  WhatsAppSettings,
} from "../common.types";
import {
  getUpdatedWhatsAppSettings,
  refreshWhatsAppStatus,
} from "@/actions/whatsapp/whatsapp-status";

function useWhatsAppStatus(): UseWhatsAppStatusReturn {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  /**
   * 🔄 Update connection status
   */
  const handleRefreshStatus = useCallback(
    async (onSuccess?: (info: ConnectionInfo) => void) => {
      setIsRefreshing(true);

      try {
        const result = await refreshWhatsAppStatus();

        if (result.success && result.data) {
          const connectionInfo = result.data;
          const isConnected = connectionInfo.status === "connected";

          const message = isConnected
            ? "Status: Conectado ✅"
            : "Status: Desconectado ❌";

          toast.success(message);
          onSuccess?.(connectionInfo);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error("Erro inesperado ao atualizar status");
      } finally {
        setIsRefreshing(false);
      }
    },
    [],
  );

  /**
   * ⚙️ Update settings
   */
  const handleRefreshSettings = useCallback(
    async (onSuccess?: (settings: WhatsAppSettings) => void) => {
      setIsRefreshing(true);

      try {
        const result = await getUpdatedWhatsAppSettings();

        if (result.success && result.data) {
          toast.success("Configurações atualizadas");
          onSuccess?.(result.data);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error("Erro inesperado ao atualizar configurações");
      } finally {
        setIsRefreshing(false);
      }
    },
    [],
  );

  return {
    isRefreshing,
    handleRefreshStatus,
    handleRefreshSettings,
  };
}

export { useWhatsAppStatus };
