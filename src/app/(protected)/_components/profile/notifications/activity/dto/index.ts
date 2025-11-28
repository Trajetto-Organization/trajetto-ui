interface ActivityNotificationsProps {
  initialEnabled: boolean;
}

interface ActivityNotificationsReturn {
  isEnabled: boolean;
  isUpdating: boolean;
  handleToggle: (enabled: boolean) => Promise<void>;
}

export type { ActivityNotificationsProps, ActivityNotificationsReturn };
