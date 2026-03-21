import { useEffect, useRef, useState } from "react";
import type { DashboardUpdateProfileAccessFormState } from "../dashboard-update-profile-access-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

interface UseDashboardUpdateProfileAccessFormProps {
  state: DashboardUpdateProfileAccessFormState | null;
  handleCloseUpdateProfileAccess: () => void;
  profileName: string;
  isUpdateProfileAccess: boolean;
}

function useDashboardUpdateProfileAccessForm({
  state,
  handleCloseUpdateProfileAccess,
  profileName,
  isUpdateProfileAccess,
}: UseDashboardUpdateProfileAccessFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [profileAccessName, setProfileAccessName] =
    useState<string>(profileName);

  useEffect(() => {
    if (!isUpdateProfileAccess) {
      const newProfileAccessName = profileName;

      if (newProfileAccessName !== profileAccessName) {
        setProfileAccessName(newProfileAccessName);
      }
    }
  }, [isUpdateProfileAccess, profileName, profileAccessName]);

  const handleUpdateProfileAccessName = (updatedName: string) => {
    setProfileAccessName(updatedName);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.updateProfileAccessError?.updateProfileAccessErrorMessage) {
      toast.error(
        state.updateProfileAccessError.updateProfileAccessErrorMessage,
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
            revalidateTagName("update-profile-access"),
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
      handleCloseUpdateProfileAccess();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdateProfileAccess]);

  const isDirty = [profileAccessName !== profileName].some(Boolean);

  return {
    handleUpdateProfileAccessName,
    profileAccessName,
    setProfileAccessName,
    isDirty,
    formRef,
  };
}

export { useDashboardUpdateProfileAccessForm };
