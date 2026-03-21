interface KanbanEmptyStateProps {
  searchQuery?: string;
  businessId?: string;
  onOpenColumnModal?: () => void;
  onSearchChange?: (query: string) => void;
  updateUrl?: (updates: Record<string, string | null>) => void;
  hasLimitedAccess?: boolean;
}

export type { KanbanEmptyStateProps };
