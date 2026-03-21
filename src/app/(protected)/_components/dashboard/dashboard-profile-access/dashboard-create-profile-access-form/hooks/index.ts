import { useEffect, useRef, useState } from "react";
import type { DashboardCreateProfileAccessFormState } from "../dashboard-create-profile-access-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

function useCreateDashboardProfileAccessForm(
  state: DashboardCreateProfileAccessFormState | null,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateCreateProfileAccessForm, setIsCreateCreateProfileAccessForm] =
    useState<boolean>(false);

  const handleOpenCreateProfileAccessForm = () => {
    setIsCreateCreateProfileAccessForm(!isCreateCreateProfileAccessForm);

    if (isCreateCreateProfileAccessForm) {
      formRef.current?.reset();
    }
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createProfileAccessError?.createProfileAccessErrorMessage) {
      toast.error(
        state.createProfileAccessError.createProfileAccessErrorMessage,
      );

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
            revalidateTagName("create-profile-access"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "profile";

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
      handleOpenCreateProfileAccessForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateCreateProfileAccessForm,
    handleOpenCreateProfileAccessForm,
    formRef,
  };
}

export { useCreateDashboardProfileAccessForm };
