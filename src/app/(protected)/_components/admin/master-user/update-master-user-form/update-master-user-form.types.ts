interface UpdateMasterUserValidationError {
  email?: string[];
  name?: string[];
  password?: string[];
  updateMasterUserErrorMessage?: string;
}

interface UpdateMasterUserFormState {
  updateMasterUserError?: UpdateMasterUserValidationError;
  successMessage?: string;
}

interface UpdateMasterUserFormSubmitProps {
  state: UpdateMasterUserFormState;
  handleUpdateMasterUserEmail: (updatedEmail: string) => void;
  handleUpdateMasterUserName: (updatedName: string) => void;
  handleOpenUpdateMasterUser: () => void;
  isDirty: boolean;
  masterUserValues: {
    masterUserEmail: string;
    masterUserName: string;
  };
}

export type { UpdateMasterUserFormState, UpdateMasterUserFormSubmitProps };
