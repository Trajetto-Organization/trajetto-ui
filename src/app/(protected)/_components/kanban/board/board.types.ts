import type { KanbanColumn, KanbanLabel } from "../shared/common.types";

interface KanbanBoard {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  businessId: string;
  columns: KanbanColumn[];
  labels?: KanbanLabel[];
  created_at: string;
  updated_at: string;
}

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

interface KanbanBoardProps {
  board: KanbanBoard;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  lastElementRef?: (node: HTMLDivElement) => void;
}

interface OriginalPositions {
  card?: {
    id: string;
    originalPosition: number;
    originalColumnId: string;
  };
  column?: {
    id: string;
    originalPosition: number;
  };
}

interface UseKanbanBoardProps {
  initialBoard: KanbanBoard;
}

export type {
  ReorderKanbanColumnState,
  ReorderKanbanCardsState,
  KanbanBoardProps,
  OriginalPositions,
  UseKanbanBoardProps,
};
