interface BulkConfigurePermissionsValidationError {
  bulkConfigurePermissionsErrorMessage?: string;
  businessId?: string[];
  profileAccessId?: string[];
  permissions?: string[];
}

interface BulkConfigurePermissionsFormState {
  bulkConfigurePermissionsError?: BulkConfigurePermissionsValidationError;
  successMessage?: string;
}

interface BulkConfigurePermissionsDialogProps {
  profileAccessId: string;
  businessId: string;
  profileName: string;
  isOpen: boolean;
  onClose: () => void;
}

export type {
  BulkConfigurePermissionsFormState,
  BulkConfigurePermissionsDialogProps,
};
