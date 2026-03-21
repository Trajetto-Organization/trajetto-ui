import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { UserTwoFactorFormState } from "../user-two-factor-authentication.types";

function useTwoFactorAuthenticationForm(state: UserTwoFactorFormState | null) {
  const [isOpenTwoFactorModal, setIsOpenTwoFactorModal] =
    useState<boolean>(false);

  const handleTwoFactorAuthentication = () => {
    setIsOpenTwoFactorModal(!isOpenTwoFactorModal);
  };

  useEffect(() => {
    if (state?.twoFactorAuthenticationError) {
      toast.error(state.twoFactorAuthenticationError);
    } else if (state?.successMessage) {
      toast.success(state?.successMessage);
      handleTwoFactorAuthentication();
    }
  }, [state]);

  return {
    handleTwoFactorAuthentication,
    isOpenTwoFactorModal,
  };
}

export { useTwoFactorAuthenticationForm };
