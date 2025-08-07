interface ReorderKanbanColumnValidationError {
  businessId?: string[];
  columns?: string[];
  reorderColumnsErrorMessage?: string;
}

interface ReorderKanbanColumnState {
  reorderColumnsError?: ReorderKanbanColumnValidationError;
  successMessage?: string;
}

interface ReorderKanbanCardsValidationError {
  cards?: string[];
  reorderCardsErrorMessage?: string;
}

interface ReorderKanbanCardsState {
  reorderCardsError?: ReorderKanbanCardsValidationError;
  successMessage?: string;
}

export type { ReorderKanbanColumnState, ReorderKanbanCardsState };
