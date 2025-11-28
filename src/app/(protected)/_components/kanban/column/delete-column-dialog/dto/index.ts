import { KanbanColumn } from "../../../dto";

interface DeleteColumnDialogFormState {
  deleteColumnError?: string;
  successMessage?: string;
}

interface DeleteColumnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  column: KanbanColumn;
}

interface UseDeleteColumnDialogProps {
  state: DeleteColumnDialogFormState | null;
  onClose: () => void;
  businessId?: string;
}

export type {
  DeleteColumnDialogFormState,
  DeleteColumnDialogProps,
  UseDeleteColumnDialogProps,
};
