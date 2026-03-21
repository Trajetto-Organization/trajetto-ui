import { useEffect, useRef, useState } from "react";
import type { DashboardCreateSupplierFormState } from "../dashboard-create-supplier-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

function useDashboardCreateSupplierForm(
  state: DashboardCreateSupplierFormState | null,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateSupplierForm, setIsCreateSupplierForm] =
    useState<boolean>(false);

  const handleOpenCreateSupplierForm = () => {
    if (isCreateSupplierForm) {
      formRef.current?.reset();
    }

    setIsCreateSupplierForm(!isCreateSupplierForm);
  };

  const handleCloseDialog = () => {
    handleOpenCreateSupplierForm();
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createSupplierError?.createSupplierErrorMessage) {
      toast.error(state.createSupplierError.createSupplierErrorMessage);
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
            revalidateTagName("create-supplier"),
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
      handleOpenCreateSupplierForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateSupplierForm,
    handleCloseDialog,
    handleOpenCreateSupplierForm,
    formRef,
  };
}

export { useDashboardCreateSupplierForm };
