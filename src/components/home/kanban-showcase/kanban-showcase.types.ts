type Priority = "low" | "medium" | "high" | "urgent";

interface ShowcaseCard {
  title: string;
  description?: string;
  priority: Priority;
  dueDate: string;
  user: string;
  userColor: string;
  completed?: boolean;
  overdue?: boolean;
}

interface ShowcaseColumn {
  title: string;
  color: string;
  cards: ShowcaseCard[];
}

export type { Priority, ShowcaseCard, ShowcaseColumn };
