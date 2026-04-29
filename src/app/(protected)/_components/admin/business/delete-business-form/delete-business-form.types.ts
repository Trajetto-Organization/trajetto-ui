interface DeleteBusinessFormState {
  deleteBusinessError?: string;
  successMessage?: string;
}

interface RequestDeletionFormState {
  requestBusinessDeletionError?: string;
  successMessage?: string;
}

type DeletionStep = "confirm-name" | "enter-code";

export type { DeleteBusinessFormState, RequestDeletionFormState, DeletionStep };
