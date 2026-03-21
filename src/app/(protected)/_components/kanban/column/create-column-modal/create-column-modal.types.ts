interface CreateColumnModalValidationError {
  title?: string[];
  color?: string[];
  createColumnErrorMessage?: string;
}

interface CreateColumnModalFormState {
  createColumnError?: CreateColumnModalValidationError;
  successMessage?: string;
}

interface CreateColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
}

interface CreateColumnFormProps {
  onClose: () => void;
  state: CreateColumnModalFormState;
}

export type {
  CreateColumnModalFormState,
  CreateColumnModalProps,
  CreateColumnFormProps,
};
