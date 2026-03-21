interface KanbanBoardProviderProps {
  businessId?: string;
  initialSearch?: string;
  showBusinessSelector?: boolean;
  mode?: "admin" | "dashboard";
}

export type { KanbanBoardProviderProps };
