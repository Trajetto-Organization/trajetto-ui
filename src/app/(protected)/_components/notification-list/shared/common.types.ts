interface Notification {
  id: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string | Date;
  type: string;
}

export type { Notification };
