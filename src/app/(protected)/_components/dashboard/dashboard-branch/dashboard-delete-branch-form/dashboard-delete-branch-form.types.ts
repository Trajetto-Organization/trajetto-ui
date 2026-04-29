interface DashboardDeleteBranchFormState {
  deleteBranchError?: string;
  successMessage?: string;
}

interface RequestDeletionFormState {
  requestBranchDeletionError?: string;
  successMessage?: string;
}

type DeletionStep = "confirm-name" | "enter-code";

export type {
  DashboardDeleteBranchFormState,
  RequestDeletionFormState,
  DeletionStep,
};
