import { useEffect, useRef, useState } from "react";
import { CreatePermissionFormState } from "../dto";

import {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
} from "../../../../dto";

import { toast } from "sonner";
import { revalidateTagName } from "@/actions/revalidate";

function useCreatePermissionForm(state: CreatePermissionFormState | null) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreatePermissionForm, setIsCreatePermissionForm] =
    useState<boolean>(false);

  const [commandBusinnessInputValue, setCommandBussinessInputValue] =
    useState<CommandBusinessInputValue>({
      searchBusinessInputValue: "",
      businessId: "",
    });

  const [commandProfileAccessInputValue, setCommandProfileAccessInputValue] =
    useState<CommandProfileAccessInputValue>({
      searchProfileAccessInputValue: "",
      profileAccessId: "",
    });

  const handleUpdateSearchBussinessInputValue = ({
    searchBusinessInputValue,
    businessId,
  }: CommandBusinessInputValue) => {
    setCommandProfileAccessInputValue({
      searchProfileAccessInputValue: "",
      profileAccessId: "",
    });

    const updateCommandInputValue =
      commandBusinnessInputValue.businessId === businessId
        ? { searchBusinessInputValue: "", businessId: "" }
        : { searchBusinessInputValue, businessId };

    setCommandBussinessInputValue(updateCommandInputValue);
  };

  const handleUpdateSearchProfileAccessInputValue = ({
    searchProfileAccessInputValue,
    profileAccessId,
  }: CommandProfileAccessInputValue) => {
    const updateCommandInputValue =
      commandProfileAccessInputValue.profileAccessId === profileAccessId
        ? { searchProfileAccessInputValue: "", profileAccessId: "" }
        : { searchProfileAccessInputValue, profileAccessId };

    setCommandProfileAccessInputValue(updateCommandInputValue);
  };

  const handleOpenCreatePermissionForm = () => {
    setIsCreatePermissionForm(!isCreatePermissionForm);

    if (isCreatePermissionForm) {
      formRef.current?.reset();

      setCommandBussinessInputValue({
        businessId: "",
        searchBusinessInputValue: "",
      });

      setCommandProfileAccessInputValue({
        profileAccessId: "",
        searchProfileAccessInputValue: "",
      });
    }
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createPermissionError?.createPermissionErrorMessage) {
      toast.error(state.createPermissionError.createPermissionErrorMessage);
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
          await revalidateTagName("create-permission");
        } catch (error: any) {
          toast.error(error.message);
        }
      };

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately after showing toast
      handleOpenCreatePermissionForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreatePermissionForm,
    handleOpenCreatePermissionForm,
    commandBusinnessInputValue,
    commandProfileAccessInputValue,
    handleUpdateSearchBussinessInputValue,
    handleUpdateSearchProfileAccessInputValue,
    formRef,
  };
}

export { useCreatePermissionForm };
