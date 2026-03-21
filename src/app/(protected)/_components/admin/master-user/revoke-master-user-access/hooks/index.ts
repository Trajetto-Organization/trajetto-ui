import { useEffect, useRef, useState } from "react";
import type { RevokeMasterUserAccessFormState } from "../revoke-master-user-access.types";

import { queryClientProps } from "@/lib/query-client-props";
import { revalidateTagName } from "@/actions/revalidate";

import { toast } from "sonner";

function useRevokeMasterUserAccessForm(
  state: RevokeMasterUserAccessFormState | null,
) {
  const toastShownRef = useRef(false);
  const [
    isOpenRevokeMasterUserAccessForm,
    setIsOpenRevokeMasterUserAccessForm,
  ] = useState<boolean>(false);

  const handleRevokeMasterUserAccessForm = () => {
    setIsOpenRevokeMasterUserAccessForm(!isOpenRevokeMasterUserAccessForm);
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
            revalidateTagName("revoke-master-user"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "master-user";

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
      handleRevokeMasterUserAccessForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleRevokeMasterUserAccessForm,
    isOpenRevokeMasterUserAccessForm,
  };
}

export { useRevokeMasterUserAccessForm };
