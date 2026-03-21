import { ReactNode } from "react";
import { UserRole } from "@/app/(protected)/_components/shared/common.types";

interface WhatsAppContextType {
  settings: WhatsAppSettings | null;
  syncProgress: SyncProgressData | null;
  showSyncProgress: boolean;
  showConnectionConfirmation: boolean;
  isUpdatingSettings: boolean;
  updateSettings: (settings: WhatsAppSettings) => void;
  clearSyncProgress: () => void;
  setUpdatingSettings: (updating: boolean) => void;
}

interface WhatsAppProviderProps {
  children: ReactNode;
  initialSettings: WhatsAppSettings | null;
}

interface WhatsAppSettings {
  enabled: boolean;
  phoneNumber?: string;
  instanceConnected: boolean;
  instanceName: string;
}

interface UpdateWhatsAppSettingsRequest {
  whatsapp_notifications_enabled: boolean;
  whatsapp_phone?: string;
}

interface QRCodeData {
  code: string;
  expiresIn?: number;
}

interface ConnectionInfo {
  instanceName: string;
  status: "connected" | "disconnected" | "connecting" | "not_exists";
  phoneNumber?: string;
  qrCodeAvailable: boolean;
  pairingCodeAvailable: boolean;
}

interface WhatsAppResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

interface WebSocketNotification {
  type: string;
  title: string;
  message: string;
  data?: any;
}

interface SyncProgressData {
  progress: number;
  chats: number;
  contacts: number;
  messages: number;
  isComplete: boolean;
}

interface UseWhatsAppConnectionReturn {
  // Connection States
  isConnecting: boolean;
  isLoadingQR: boolean;
  showConnectionDialog: boolean;

  // Connection data
  qrCodeData: QRCodeData | null;

  // Handlers
  handleGetQRCode: () => Promise<void>;
  handleCloseDialog: () => void;
  setShowConnectionDialog: (show: boolean) => void;
  isAnyOperationActive: boolean;
}

interface UseWhatsAppGlobalEventsProps {
  onConnectionUpdate?: (isConnected: boolean, data?: any) => void;
  onWhatsAppDisabled?: (data?: any) => void;
  onModalShouldClose?: () => void;
}

interface UseWhatsAppSettingsReturn {
  isUpdating: boolean;
  phoneNumber: string;
  isPhoneModified: boolean;
  handlePhoneChange: (value: string) => void;
  handleToggleNotifications: (
    enabled: boolean,
    onSuccess?: (data: WhatsAppSettings) => void,
  ) => Promise<void>;
  handleUpdatePhone: (
    onSuccess?: (data: WhatsAppSettings) => void,
  ) => Promise<void>;
}

interface UseWhatsAppSettingsProps {
  initialSettings: WhatsAppSettings | null;
  isAnyOperationActive?: boolean; // To disable during connection operations
}

interface UseWhatsAppStatusReturn {
  isRefreshing: boolean;
  handleRefreshStatus: (
    onSuccess?: (info: ConnectionInfo) => void,
  ) => Promise<void>;
  handleRefreshSettings: (
    onSuccess?: (settings: WhatsAppSettings) => void,
  ) => Promise<void>;
}

interface RefreshStatusButtonProps {
  isAnyOperationActive: boolean;
}

interface WhatsAppNotificationsProps {
  error: boolean;
  userRole?: UserRole;
  driverId?: string | null;
}

interface WhatsAppSettingsProps {
  userRole?: UserRole;
  driverId?: string | null;
}

interface WhatsAppStatusProps {
  userRole?: UserRole;
  driverId?: string | null;
}

export type {
  WhatsAppSettings,
  UpdateWhatsAppSettingsRequest,
  QRCodeData,
  ConnectionInfo,
  WhatsAppResponse,
  WebSocketNotification,
  SyncProgressData,
  WhatsAppContextType,
  WhatsAppProviderProps,
  UseWhatsAppConnectionReturn,
  UseWhatsAppGlobalEventsProps,
  UseWhatsAppSettingsReturn,
  UseWhatsAppSettingsProps,
  UseWhatsAppStatusReturn,
  RefreshStatusButtonProps,
  WhatsAppNotificationsProps,
  WhatsAppSettingsProps,
  WhatsAppStatusProps,
};
