import { useEffect, useRef, useState } from "react";
import { CreateProfileAccessFormState } from "../dto";

import { toast } from "sonner";
import { CommandBusinessInputValue } from "../../../../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

function useCreateProfileAccessForm(
  state: CreateProfileAccessFormState | null,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateCreateProfileAccessForm, setIsCreateCreateProfileAccessForm] =
    useState<boolean>(false);

  const [commandBusinessInputValue, setCommandBusinessInputValue] =
    useState<CommandBusinessInputValue>({
      searchBusinessInputValue: "",
      businessId: "",
    });

  const handleUpdateSearchBusinessInputValue = ({
    searchBusinessInputValue,
    businessId,
  }: CommandBusinessInputValue) => {
    const updateCommandInputValue =
      commandBusinessInputValue.businessId === businessId
        ? { searchBusinessInputValue: "", businessId: "" }
        : { searchBusinessInputValue, businessId };

    setCommandBusinessInputValue(updateCommandInputValue);
  };

  const handleOpenCreateProfileAccessForm = () => {
    setIsCreateCreateProfileAccessForm(!isCreateCreateProfileAccessForm);

    if (isCreateCreateProfileAccessForm) {
      formRef.current?.reset();

      const resetCommandInputValue = {
        searchBusinessInputValue: "",
        businessId: "",
      };

      setCommandBusinessInputValue(resetCommandInputValue);
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
    handleUpdateSearchBusinessInputValue,
    commandBusinessInputValue,
    formRef,
  };
}

export { useCreateProfileAccessForm };
