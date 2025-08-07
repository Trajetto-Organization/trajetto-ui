import { useEffect, useRef, useState } from "react";

import { UserNameFormState } from "../dto";
import { toast } from "sonner";

interface UseUserNameForm {
  state: UserNameFormState | null;
  initialUserName: string;
  error: boolean;
}

function useUserNameForm({ state, initialUserName, error }: UseUserNameForm) {
  const [userNameValue, setUserNameValue] = useState<string>(initialUserName);
  const [isUpdated, setIsUpdated] = useState<boolean>(false);

  const toastDisplayed = useRef(false);

  const handleUserName = (updatedUserName: string) => {
    setUserNameValue(updatedUserName);
    setIsUpdated(updatedUserName !== initialUserName);
  };

  useEffect(() => {
    if (state?.userNameError) {
      toast.error(state.userNameError);
    } else if (state?.successMessage) {
      toast.success(state.successMessage);
      setIsUpdated(false);
    }
  }, [state]);

  useEffect(() => {
    if (error && !toastDisplayed.current) {
      toast.error("Houve um erro ao tentar recuperar o usuário");
      toastDisplayed.current = true;
    }
  }, [error]);

  return {
    handleUserName,
    userNameValue,
    isUpdated,
  };
}

export { useUserNameForm };
