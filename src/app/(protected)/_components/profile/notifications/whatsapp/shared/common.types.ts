import { UserRole } from "@/app/(protected)/_components/shared/common.types";

/**
 * Mirror of the API's WhatsApp settings. There is no connection state: the
 * official Meta Cloud API sends from one registered business number, so a user
 * only opts in and provides the number that receives the notifications.
 */
interface WhatsAppSettings {
  enabled: boolean;
  phoneNumber?: string;

  /**
   * Whether the server has Meta Cloud API credentials. Preferences can be
   * saved either way; the UI explains that nothing arrives until ops
   * configures the service.
   */
  serviceConfigured: boolean;
}

interface UpdateWhatsAppSettingsRequest {
  whatsapp_notifications_enabled: boolean;
  whatsapp_phone?: string;
}

interface WhatsAppResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

interface WhatsAppNotificationsProps {
  error: boolean;
  userRole?: UserRole;
  driverId?: string | null;
  initialSettings: WhatsAppSettings | null;
}

interface WhatsAppSettingsProps {
  userRole?: UserRole;
  driverId?: string | null;
  initialSettings: WhatsAppSettings | null;
}

interface UseWhatsAppSettingsReturn {
  settings: WhatsAppSettings | null;
  isUpdating: boolean;
  phoneNumber: string;
  isPhoneModified: boolean;
  isPhoneValid: boolean;
  handlePhoneChange: (value: string) => void;
  handleToggleNotifications: (enabled: boolean) => Promise<void>;
  handleSavePhone: () => Promise<void>;
}

interface UseWhatsAppSettingsProps {
  initialSettings: WhatsAppSettings | null;
}

export type {
  WhatsAppSettings,
  UpdateWhatsAppSettingsRequest,
  WhatsAppResponse,
  WhatsAppNotificationsProps,
  WhatsAppSettingsProps,
  UseWhatsAppSettingsReturn,
  UseWhatsAppSettingsProps,
};
