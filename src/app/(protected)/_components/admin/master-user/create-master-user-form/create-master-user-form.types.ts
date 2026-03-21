interface CreateMasterUserValidationError {
  email?: string[];
  name?: string[];
  password?: string[];
  createMasterUserErrorMessage?: string;
}

interface CreateMasterUserFormState {
  createMasterUserError?: CreateMasterUserValidationError;
  successMessage?: string;
}

interface CreateMasterUserFormSubmitProps {
  state: CreateMasterUserFormState;
  handleOpenCreateMasterUserForm: () => void;
}

export type { CreateMasterUserFormSubmitProps, CreateMasterUserFormState };
