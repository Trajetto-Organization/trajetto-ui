import { KanbanBoard } from "../../dto";

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
