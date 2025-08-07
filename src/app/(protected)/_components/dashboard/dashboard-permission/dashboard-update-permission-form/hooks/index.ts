import { useEffect, useRef, useState } from "react";
import { DashboardUpdatePermissionFormState } from "../dto";

import { DashboardPermissionProps } from "../../dto";
import { CommandProfileAccessInputValue } from "@/app/(protected)/_components/dto";

import { toast } from "sonner";
import { revalidateTagName } from "@/actions/revalidate";

interface UseUpdatePermissionFormProps {
  state: DashboardUpdatePermissionFormState | null;
  handleOpenUpdatePermission: () => void;
  permissionValues: DashboardPermissionProps;
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
  },
}: UseUpdatePermissionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [permission, setPermission] = useState<string>(action);
  const [permissionKey, setPermissionKey] = useState<string>(permissionKeyName);

  const [canRead, setCanRead] = useState<boolean>(canReadPermission);
  const [canWrite, setCanWrite] = useState<boolean>(canWritePermission);

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

    commandProfileAccessInputValue.profileAccessId !== profileAccessId,
  ].some(Boolean);

  return {
    handleUpdatePermissionName,
    handleUpdateCanReadPermission,
    handleUpdateCanWritePermission,
    handleUpdateSearchProfileAccessInputValue,
    commandProfileAccessInputValue,
    handleUpdatePermissionKeyName,
    permissionKey,
    permission,
    canRead,
    canWrite,
    isDirty,
    formRef,
  };
}

export { useUpdatePermissionForm };
