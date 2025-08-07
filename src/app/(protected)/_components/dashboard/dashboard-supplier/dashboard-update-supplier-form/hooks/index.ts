import { useEffect, useRef } from "react";
import { DashboardUpdateSupplierFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

interface UseDashboardUpdateSupplierFormProps {
  state: DashboardUpdateSupplierFormState | null;
  handleCloseUpdateSupplier: () => void;
}

function useDashboardUpdateSupplierForm({
  state,
  handleCloseUpdateSupplier,
}: UseDashboardUpdateSupplierFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  useEffect(() => {
    // Handle error case first
    if (state?.updateSupplierError?.updateSupplierErrorMessage) {
      toast.error(state.updateSupplierError.updateSupplierErrorMessage);
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
            revalidateTagName("update-supplier"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "supplier";

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

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately after showing toast
      handleCloseUpdateSupplier();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdateSupplier]);

  return {
    formRef,
  };
}

export { useDashboardUpdateSupplierForm };
