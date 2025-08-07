import { useEffect, useRef, useState } from "react";
import { UpdateProfileAccessFormState } from "../dto";

import { toast } from "sonner";
import { CommandBusinessInputValue } from "../../../../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

interface UseUpdateProfileAccessFormProps {
  state: UpdateProfileAccessFormState | null;
  handleCloseUpdateProfileAccess: () => void;
  profileName: string;
  profileBusiness: CommandBusinessInputValue;
  isUpdateProfileAccess: boolean;
}

function useUpdateProfileAccessForm({
  state,
  handleCloseUpdateProfileAccess,
  profileName,
  profileBusiness,
  isUpdateProfileAccess,
}: UseUpdateProfileAccessFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [profileAccessName, setProfileAccessName] =
    useState<string>(profileName);

  const [commandBusinnessInputValue, setCommandBussinessInputValue] =
    useState<CommandBusinessInputValue>({
      searchBusinessInputValue: "",
      businessId: "",
    });

  useEffect(() => {
    if (isUpdateProfileAccess) {
      setProfileAccessName(profileName);
      setCommandBussinessInputValue({
        businessId: profileBusiness.businessId,
        searchBusinessInputValue: profileBusiness.searchBusinessInputValue,
      });
    }
  }, [
    isUpdateProfileAccess,
    profileName,
    profileBusiness.searchBusinessInputValue,
    profileBusiness.businessId,
  ]);

  const handleUpdateSearchBussinessInputValue = ({
    searchBusinessInputValue,
    businessId,
  }: CommandBusinessInputValue) => {
    const updateCommandInputValue =
      commandBusinnessInputValue.businessId === businessId
        ? { searchBusinessInputValue: "", businessId: "" }
        : { searchBusinessInputValue, businessId };

    setCommandBussinessInputValue(updateCommandInputValue);
  };

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

  const isDirty = [
    profileAccessName !== profileName,
    commandBusinnessInputValue.businessId !== profileBusiness.businessId,
    commandBusinnessInputValue.searchBusinessInputValue !==
      profileBusiness.searchBusinessInputValue,
  ].some(Boolean);

  return {
    handleUpdateSearchBussinessInputValue,
    handleUpdateProfileAccessName,
    commandBusinnessInputValue,
    profileAccessName,
    setProfileAccessName,
    isDirty,
    formRef,
  };
}

export { useUpdateProfileAccessForm };
