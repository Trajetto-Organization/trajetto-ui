interface KanbanUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

interface KanbanLabel {
  id: string;
  name: string;
  color: string;
}

interface KanbanCard {
  id: string;
  title: string;
  description?: string | null;
  position: number;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string | null;
  completed?: boolean;
  columnId: string;
  assignedUserId?: string | null;
  assignedTo?: KanbanUser | null; // Assigned user data
  assignedUser?: KanbanUser | null; // Alternative - support both formats
  createdById?: string;
  createdBy?: KanbanUser;
  serviceOrderId?: string | null;
  accountPayableId?: string | null;
  labels?: KanbanLabel[];
  commentsCount?: number;
  created_at: string;
  updated_at: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  position: number;
  color: string;
  businessId: string;
  cards: KanbanCard[];
  cardsCount?: number; // Card count in column
  created_at: string;
  updated_at: string;
}

export type { KanbanColumn, KanbanCard, KanbanLabel, KanbanUser };
