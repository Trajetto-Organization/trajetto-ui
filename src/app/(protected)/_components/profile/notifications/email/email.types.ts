interface EmailNotificationsProps {
  initialEnabled: boolean;
}

interface EmailNotificationsReturn {
  isEnabled: boolean;
  isUpdating: boolean;
  handleToggle: (enabled: boolean) => Promise<void>;
}

export type { EmailNotificationsProps, EmailNotificationsReturn };
