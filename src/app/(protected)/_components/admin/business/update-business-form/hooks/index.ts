import { useEffect, useRef } from "react";
import type { UpdateBusinessFormState } from "../update-business-form.types";

import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

interface UseUpdateBusinessFormProps {
  state: UpdateBusinessFormState | null;
  handleCloseUpdateBusiness: () => void;
}

function useUpdateBusinessForm({
  state,
  handleCloseUpdateBusiness,
}: UseUpdateBusinessFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  useEffect(() => {
    // Handle error case first
    if (state?.updateBusinessError?.updateBusinessErrorMessage) {
      toast.error(state.updateBusinessError.updateBusinessErrorMessage);
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
          await queryClientProps.resetQueries({
            predicate: (query) => {
              const isMatch =
                Array.isArray(query.queryKey) &&
                query.queryKey[0] === "business";

              return isMatch;
            },
          });
        } catch (error: any) {
          if (process.env.NODE_ENV === "development") {
            console.error("Erro na revalidação:", error);
          }

          toast.error("Erro ao atualizar dados. Recarregue a página.");
        }
      };

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately after showing toast
      handleCloseUpdateBusiness();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdateBusiness]);

  return {
    formRef,
  };
}

export { useUpdateBusinessForm };
