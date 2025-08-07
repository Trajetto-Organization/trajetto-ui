interface UpdateColumnDialogValidationError {
  title?: string[];
  color?: string[];
  updateColumnErrorMessage?: string;
}

interface UpdateColumnDialogFormState {
  updateColumnError?: UpdateColumnDialogValidationError;
  successMessage?: string;
}

export type { UpdateColumnDialogFormState };
