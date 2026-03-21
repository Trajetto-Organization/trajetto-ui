import { useEffect, useRef, useState } from "react";

import type { CreatePermissionFormState } from "../create-permission-form.types";
import type {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
} from "@/app/(protected)/_components/shared/common.types";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

function useCreatePermissionForm(state: CreatePermissionFormState | null) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreatePermissionForm, setIsCreatePermissionForm] =
    useState<boolean>(false);

  const [commandBusinessInputValue, setCommandBusinessInputValue] =
    useState<CommandBusinessInputValue>({
      searchBusinessInputValue: "",
      businessId: "",
    });

  const [commandProfileAccessInputValue, setCommandProfileAccessInputValue] =
    useState<CommandProfileAccessInputValue>({
      searchProfileAccessInputValue: "",
      profileAccessId: "",
    });

  const handleUpdateSearchBusinessInputValue = ({
    searchBusinessInputValue,
    businessId,
  }: CommandBusinessInputValue) => {
    setCommandProfileAccessInputValue({
      searchProfileAccessInputValue: "",
      profileAccessId: "",
    });

    const updateCommandInputValue =
      commandBusinessInputValue.businessId === businessId
        ? { searchBusinessInputValue: "", businessId: "" }
        : { searchBusinessInputValue, businessId };

    setCommandBusinessInputValue(updateCommandInputValue);
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

      setCommandBusinessInputValue({
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
    commandBusinessInputValue,
    commandProfileAccessInputValue,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchProfileAccessInputValue,
    formRef,
  };
}

export { useCreatePermissionForm };
