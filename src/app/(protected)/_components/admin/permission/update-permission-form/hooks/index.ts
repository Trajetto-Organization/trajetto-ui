import { useEffect, useRef, useState } from "react";
import { UpdatePermissionFormState } from "../dto";

import { PermissionProps } from "../../dto";
import {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
} from "../../../../dto";

import { toast } from "sonner";
import { revalidateTagName } from "@/actions/revalidate";

interface UseUpdatePermissionFormProps {
  state: UpdatePermissionFormState | null;
  handleOpenUpdatePermission: () => void;
  permissionValues: PermissionProps;
  isUpdatePermission: boolean;
}

function useUpdatePermissionForm({
  state,
  handleOpenUpdatePermission,
  isUpdatePermission,
  permissionValues: {
    action,
    canRead: canReadPermission,
    canWrite: canWritePermission,
    permission: permissionKeyName,
    businessId,
    profileAccessId,
    profile_name,
    corporate_reason,
  },
}: UseUpdatePermissionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [permission, setPermission] = useState<string>(action);
  const [permissionKey, setPermissionKey] = useState<string>(permissionKeyName);

  const [canRead, setCanRead] = useState<boolean>(canReadPermission);
  const [canWrite, setCanWrite] = useState<boolean>(canWritePermission);

  const [commandBusinnessInputValue, setCommandBussinessInputValue] =
    useState<CommandBusinessInputValue>({
      searchBusinessInputValue: corporate_reason as string,
      businessId,
    });

  const [commandProfileAccessInputValue, setCommandProfileAccessInputValue] =
    useState<CommandProfileAccessInputValue>({
      searchProfileAccessInputValue: profile_name,
      profileAccessId,
    });

  useEffect(() => {
    if (!isUpdatePermission) {
      setPermission(action);
      setPermissionKey(permissionKeyName);

      setCanRead(canReadPermission);
      setCanWrite(canWritePermission);

      setCommandBussinessInputValue({
        searchBusinessInputValue: corporate_reason as string,
        businessId,
      });

      setCommandProfileAccessInputValue({
        searchProfileAccessInputValue: profile_name,
        profileAccessId,
      });
    }
  }, [
    isUpdatePermission,
    permissionKeyName,
    action,
    canReadPermission,
    canWritePermission,
    corporate_reason,
    businessId,
    profile_name,
    profileAccessId,
  ]);

  const handleUpdatePermissionName = (updatedPermission: string): void => {
    setPermission(updatedPermission);
  };

  const handleUpdatePermissionKeyName = (
    updatedPermissionKeyName: string,
  ): void => {
    setPermissionKey(updatedPermissionKeyName);
  };

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

  const handleUpdateCanReadPermission = (
    updatedCanReadPermission: boolean,
  ): void => {
    setCanRead(updatedCanReadPermission);
  };

  const handleUpdateCanWritePermission = (
    updatedCanWritePermission: boolean,
  ) => {
    setCanWrite(updatedCanWritePermission);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.updatePermissionError?.updatePermissionErrorMessage) {
      toast.error(state.updatePermissionError.updatePermissionErrorMessage);
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
          await revalidateTagName("update-permission");
        } catch (error: any) {
          toast.error(error.message);
        }
      };

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately after showing toast
      handleOpenUpdatePermission();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleOpenUpdatePermission]);

  const isDirty = [
    permission !== action,
    canRead !== canReadPermission,
    permissionKey !== permissionKeyName,
    canWrite !== canWritePermission,
    commandBusinnessInputValue.businessId !== businessId,
    commandProfileAccessInputValue.profileAccessId !== profileAccessId,
  ].some(Boolean);

  return {
    handleUpdatePermissionName,
    handleUpdateCanReadPermission,
    handleUpdateCanWritePermission,
    handleUpdateSearchBussinessInputValue,
    handleUpdateSearchProfileAccessInputValue,
    commandProfileAccessInputValue,
    handleUpdatePermissionKeyName,
    commandBusinnessInputValue,
    permissionKey,
    permission,
    canRead,
    canWrite,
    isDirty,
    formRef,
  };
}

export { useUpdatePermissionForm };
