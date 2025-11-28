import { KanbanColumn } from "../../../dto";

interface UpdateColumnDialogValidationError {
  title?: string[];
  color?: string[];
  updateColumnErrorMessage?: string;
}

interface UpdateColumnDialogFormState {
  updateColumnError?: UpdateColumnDialogValidationError;
  successMessage?: string;
}

interface UseUpdateColumnDialogProps {
  state: UpdateColumnDialogFormState | null;
  onClose: () => void;
  businessId?: string;
}

interface UpdateColumnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  column: KanbanColumn;
}

interface UpdateColumnFormProps {
  onClose: () => void;
  state: UpdateColumnDialogFormState;
  column: KanbanColumn;
}

export type {
  UpdateColumnDialogFormState,
  UseUpdateColumnDialogProps,
  UpdateColumnDialogProps,
  UpdateColumnFormProps,
};
