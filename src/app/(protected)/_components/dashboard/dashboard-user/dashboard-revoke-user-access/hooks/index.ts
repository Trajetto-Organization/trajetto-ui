import { useEffect, useRef, useState } from "react";
import type { RevokeAccessUserFormState } from "../dashboard-revoke-user-access.types";

import { queryClientProps } from "@/lib/query-client-props";
import { revalidateTagName } from "@/actions/revalidate";

import { toast } from "sonner";

function useDashboardDeleteUserForm(state: RevokeAccessUserFormState | null) {
  const toastShownRef = useRef(false);
  const [isOpenRevokeUserAccessForm, setIsOpenRevokeUserAccessForm] =
    useState<boolean>(false);

  const handleRevokeUserAccessForm = () => {
    setIsOpenRevokeUserAccessForm(!isOpenRevokeUserAccessForm);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.revokeAccessUserError) {
      toast.error(state.revokeAccessUserError);
      return;
    }

    // Handle success case
    if (state?.successMessage && !toastShownRef.current) {
      // Mark toast as shown to prevent duplicates
      toastShownRef.current = true;

      // Show the toast first
      toast.success(state.successMessage);

      // Start revalidation in background
      const performRevalidation = async () => {
        try {
          await Promise.all([
            revalidateTagName("revoke-user-registration"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) && query.queryKey[0] === "user";

                return isMatch;
              },
            }),
          ]);
        } catch (error: any) {
          if (process.env.NODE_ENV === "development") {
            console.error("Erro na revalidação:", error);
          }

          toast.error("Erro ao atualizar dados. Recarregue a página.");
        }
      };

      performRevalidation();

      // Close the modal immediately after showing toast
      handleRevokeUserAccessForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleRevokeUserAccessForm,
    isOpenRevokeUserAccessForm,
  };
}

export { useDashboardDeleteUserForm };
