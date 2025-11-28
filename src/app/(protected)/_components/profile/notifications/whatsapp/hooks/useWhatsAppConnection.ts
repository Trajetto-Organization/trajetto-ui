"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

import { QRCodeData, UseWhatsAppConnectionReturn } from "../dto";
import { getWhatsAppQRCode } from "@/actions/whatsapp/whatsapp-connection";

function useWhatsAppConnection(): UseWhatsAppConnectionReturn {
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isLoadingQR, setIsLoadingQR] = useState<boolean>(false);

  const [showConnectionDialog, setShowConnectionDialog] =
    useState<boolean>(false);

  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);

  /**
   * 📱 Get QR Code for connection with improved timing handling
   */
  const handleGetQRCode = useCallback(async () => {
    setIsLoadingQR(true);
    setIsConnecting(true);

    try {
      // Show loading toast for better UX
      const loadingToastId = toast.loading("Preparando conexão WhatsApp...", {
        duration: Infinity,
      });

      try {
        // Add initial delay to allow instance creation to complete
        await new Promise((resolve) => setTimeout(resolve, 2000));

        let attempts = 0;

        const maxAttempts = 5;
        let result;

        // Retry logic for instance creation timing
        while (attempts < maxAttempts) {
          // Update loading message for retry attempts
          if (attempts > 0) {
            toast.loading(
              `Aguardando instância... (tentativa ${attempts + 1}/${maxAttempts})`,
              {
                id: loadingToastId,
              },
            );
          }

          result = await getWhatsAppQRCode();

          if (result.success && result.data) {
            break;
          }

          // If error suggests instance is still being created, wait and retry
          if (
            result.message?.includes("erro ao tentar gerar") &&
            attempts < maxAttempts - 1
          ) {
            await new Promise((resolve) => setTimeout(resolve, 3000));

            attempts++;
            continue;
          }

          break;
        }

        // Dismiss loading toast
        toast.dismiss(loadingToastId);

        if (result?.success && result?.data) {
          setQrCodeData(result.data);
          setShowConnectionDialog(true);

          toast.success("QR Code gerado com sucesso!");
        } else {
          toast.error(
            result?.message || "Erro ao gerar QR Code. Tente novamente.",
          );

          setIsConnecting(false);
        }
      } catch (innerError) {
        toast.dismiss(loadingToastId);
        throw innerError;
      }
    } catch (error) {
      toast.error("Houve um erro inesperado ao tentar obter o QR Code!");
      setIsConnecting(false);
    } finally {
      setIsLoadingQR(false);
    }
  }, []);

  /**
   * Improved close dialog handler that resets ALL states
   */
  const handleCloseDialog = useCallback(() => {
    // Close modal
    setShowConnectionDialog(false);

    // Clear data
    setQrCodeData(null);

    // ✅ FIX: Reset all loading and connection states
    setIsConnecting(false);
    setIsLoadingQR(false);
  }, []);

  /**
   * Custom setter for dialog that also resets states when closing
   */
  const setShowConnectionDialogCustom = useCallback(
    (show: boolean) => {
      if (!show) {
        // If closing, use the proper close handler
        handleCloseDialog();
      } else {
        // If opening, just set the state
        setShowConnectionDialog(true);
      }
    },
    [handleCloseDialog],
  );

  return {
    isConnecting,
    isLoadingQR,
    showConnectionDialog,
    qrCodeData,
    handleGetQRCode,
    handleCloseDialog,
    setShowConnectionDialog: setShowConnectionDialogCustom,
    isAnyOperationActive: isConnecting || isLoadingQR || showConnectionDialog,
  };
}

export { useWhatsAppConnection };
