"use client";

import { useCallback } from "react";

import { QrCode, Loader2, Info, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useWhatsAppConnection } from "../hooks/useWhatsAppConnection";
import { useWhatsAppContext } from "../provider";

import { useWhatsAppStatus } from "../hooks/useWhatsAppStatus";
import { useWhatsAppGlobalEvents } from "../hooks/useWhatsAppGlobalEvents";

import { RefreshStatusButtonProps } from "../dto";

const RefreshStatusButton = ({
  isAnyOperationActive,
}: RefreshStatusButtonProps): JSX.Element => {
  const { settings, updateSettings } = useWhatsAppContext();
  const { isRefreshing, handleRefreshStatus } = useWhatsAppStatus();

  const onRefreshStatus = async () => {
    await handleRefreshStatus((connectionInfo) => {
      if (settings) {
        const isConnected = connectionInfo.status === "connected";
        const updatedSettings = {
          ...settings,
          instanceConnected: isConnected,
        };
        updateSettings(updatedSettings);
      }
    });
  };

  // Only shows the button if WhatsApp is enabled
  if (!settings?.enabled) {
    return <></>;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onRefreshStatus}
      disabled={isRefreshing || isAnyOperationActive}
      title="Atualizar status"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
    </Button>
  );
};

const WhatsAppConnection = (): JSX.Element | null => {
  const { settings, updateSettings } = useWhatsAppContext();

  const {
    isConnecting,
    isLoadingQR,
    showConnectionDialog,
    qrCodeData,
    handleGetQRCode,
    setShowConnectionDialog,
    isAnyOperationActive,
  } = useWhatsAppConnection();

  // Memoize callbacks to avoid infinite loop
  const handleConnectionUpdate = useCallback(
    (isConnected: boolean, data?: any) => {
      if (isConnected && settings) {
        // Update settings to reflect connection
        const updatedSettings = {
          ...settings,
          instanceConnected: true,
        };
        updateSettings(updatedSettings);
      }
    },
    [settings, updateSettings],
  );

  const handleModalClose = useCallback(() => {
    // Close the connection dialog when connected
    setShowConnectionDialog(false);
  }, [setShowConnectionDialog]);

  // Auto-close modal on connection
  useWhatsAppGlobalEvents({
    onConnectionUpdate: handleConnectionUpdate,
    onModalShouldClose: handleModalClose,
  });

  const onConnectQRCode = async () => {
    await handleGetQRCode();
  };

  // Determine what type of connection is being shown
  const connectionType = qrCodeData ? "qrcode" : null;

  // Better dialog title and description based on connection type
  const getDialogTitle = () => {
    if (connectionType === "qrcode") return "Escaneie o QR Code";
    if (connectionType === "pairing") return "Use o Código de Pareamento";
    return "Conectar WhatsApp";
  };

  const getDialogDescription = () => {
    if (connectionType === "qrcode")
      return "Abra o WhatsApp e escaneie o código abaixo";
    if (connectionType === "pairing") return "Digite o código no seu WhatsApp";
    return "Escolha uma das opções abaixo";
  };

  // If it is not enabled, it does not show
  if (!settings?.enabled) {
    return null;
  }

  // If already connected, does not show connection buttons
  if (settings.instanceConnected) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Separator />

      <div>
        <h4 className="text-sm font-medium mb-2">Conectar WhatsApp</h4>
        <p className="text-xs text-muted-foreground mb-4">
          Escolha um método para conectar seu WhatsApp
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onConnectQRCode}
            disabled={isConnecting || isLoadingQR}
          >
            {isLoadingQR ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <QrCode className="mr-2 h-4 w-4" />
            )}
            QR Code
          </Button>

          {/* Refresh button next to the QR Code */}
          <RefreshStatusButton isAnyOperationActive={isAnyOperationActive} />
        </div>
      </div>

      <Dialog
        open={showConnectionDialog}
        onOpenChange={setShowConnectionDialog}
      >
        <DialogScrollContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Show QR Code only when qrCodeData exists and no pairingCodeData */}
            {qrCodeData && (
              <div className="space-y-3">
                <div
                  className="flex justify-center 
                  p-4 bg-white rounded-lg"
                >
                  <QRCodeSVG
                    value={qrCodeData.code}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                  />
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Como usar:</strong> Abra o WhatsApp, vá em
                    Configurações → Aparelhos conectados → Conectar um aparelho
                    e escaneie o código acima.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Show error state if dialog is open but no data */}
            {showConnectionDialog && !qrCodeData && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Gerando código de conexão... Por favor, aguarde.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogScrollContent>
      </Dialog>
    </div>
  );
};

export { WhatsAppConnection };
