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

export type { CardModalFormState };
