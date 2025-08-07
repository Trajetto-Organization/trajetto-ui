interface CreateColumnModalValidationError {
  title?: string[];
  color?: string[];
  createColumnErrorMessage?: string;
}

interface CreateColumnModalFormState {
  createColumnError?: CreateColumnModalValidationError;
  successMessage?: string;
}

export type { CreateColumnModalFormState };
