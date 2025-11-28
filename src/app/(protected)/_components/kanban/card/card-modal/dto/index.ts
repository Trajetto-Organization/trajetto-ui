import { KanbanCard } from "../../../dto";

interface CardModalValidationError {
  title?: string[];
  description?: string[];
  priority?: string[];
  dueDate?: string[];
  assignedUserId?: string[];
  createCardErrorMessage?: string;
  updateCardErrorMessage?: string;
}

interface CardModalFormState {
  createCardError?: CardModalValidationError;
  updateCardError?: CardModalValidationError;
  successMessage?: string;
}

interface UseCardModalProps {
  state: CardModalFormState | null;
  onClose: () => void;
  isEditing: boolean;
  isDeleting?: boolean;
  businessId?: string;
}

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: KanbanCard | null;
  columnId: string;
  businessId: string;
}

interface UseCardModalFormProps {
  card: KanbanCard | null;
  state: CardModalFormState;
  isEditing: boolean;
}

interface CardModalFormProps {
  card: KanbanCard | null;
  businessId: string;
  onDelete: () => void;
  onClose: () => void;
  state: CardModalFormState;
  isEditing: boolean;
  isDeletingCard: boolean;
}

type PriorityProps = "low" | "medium" | "high" | "urgent";

export type {
  CardModalFormState,
  UseCardModalProps,
  CardModalProps,
  PriorityProps,
  CardModalFormProps,
  UseCardModalFormProps,
};
