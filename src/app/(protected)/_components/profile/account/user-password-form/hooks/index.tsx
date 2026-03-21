import { useEffect, useState } from "react";
import type { UpdateUserPasswordFormState } from "../user-password-form.types";

import { toast } from "sonner";

function useUpdatePasswordForm(state: UpdateUserPasswordFormState | null) {
  const [isUpdatePasswordModalOpen, setIsUpdatePasswordModalOpen] =
    useState<boolean>(false);

  const handleOpenUpdatePasswordModal = () => {
    setIsUpdatePasswordModalOpen(!isUpdatePasswordModalOpen);
  };

  useEffect(() => {
    if (state?.userPasswordError?.userPasswordErrorMessage) {
      toast.error(state?.userPasswordError?.userPasswordErrorMessage);
    } else if (state?.successMessage) {
      toast.success(state.successMessage);
      handleOpenUpdatePasswordModal();
    }
  }, [state]);

  return {
    isUpdatePasswordModalOpen,
    handleOpenUpdatePasswordModal,
  };
}

export { useUpdatePasswordForm };
