import { useEffect } from "react";
import { toast } from "sonner";

import { LogOutUserState } from "./dto";

function useProtectedAccountSettings(
  state: LogOutUserState | null | undefined,
) {
  useEffect(() => {
    if (state?.logoutError) {
      toast.error(state?.logoutError);
      return;
    }
  }, [state]);
}

export { useProtectedAccountSettings };
