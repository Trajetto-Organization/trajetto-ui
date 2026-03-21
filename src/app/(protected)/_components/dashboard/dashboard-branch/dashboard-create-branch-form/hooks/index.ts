import { useEffect, useRef, useState } from "react";
import type { DashboardCreateBranchFormState } from "../dashboard-create-branch-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

function useDashboardCreateBranchForm(
  state: DashboardCreateBranchFormState | null,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateBranchForm, setIsCreateBranchForm] = useState<boolean>(false);

  useEffect(() => {
    if (!isCreateBranchForm) {
      toast.dismiss();
    }
  }, [isCreateBranchForm]);

  const handleOpenCreateBranchForm = () => {
    if (isCreateBranchForm) {
      formRef.current?.reset();
    }

    setIsCreateBranchForm(!isCreateBranchForm);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createBranchError?.createBranchErrorMessage) {
      toast.error(state.createBranchError.createBranchErrorMessage);
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
            revalidateTagName("create-branch"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "branch";

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
      handleOpenCreateBranchForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateBranchForm,
    handleOpenCreateBranchForm,
    formRef,
  };
}

export { useDashboardCreateBranchForm };
