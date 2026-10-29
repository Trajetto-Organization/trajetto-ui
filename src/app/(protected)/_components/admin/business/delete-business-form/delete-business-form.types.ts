interface DeleteBusinessFormState {
  deleteBusinessError?: string;
  successMessage?: string;
  errorCode?: string;
  /** The code can no longer work (nothing requested, or expired). */
  requestNewCode?: boolean;
}

interface RequestDeletionFormState {
  requestBusinessDeletionError?: string;
  successMessage?: string;
}

type DeletionStep = "confirm-name" | "enter-code";

export type { DeleteBusinessFormState, RequestDeletionFormState, DeletionStep };
