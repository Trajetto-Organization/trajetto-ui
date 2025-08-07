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

export type {
  WhatsAppSettings,
  UpdateWhatsAppSettingsRequest,
  QRCodeData,
  ConnectionInfo,
  WhatsAppResponse,
  WebSocketNotification,
  SyncProgressData,
};
