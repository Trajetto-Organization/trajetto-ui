import { useEffect, useRef, useState } from "react";

import type { UpdatePermissionFormState } from "../update-permission-form.types";
import type { PermissionProps } from "../../permission.types";

import type {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
} from "@/app/(protected)/_components/shared/common.types";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

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
    permissionKey: permissionKeyName,
    profileAccess: { name },
    business,
    businessId,
    profileAccessId,
  },
}: UseUpdatePermissionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [permission, setPermission] = useState<string>(action);
  const [permissionKey, setPermissionKey] = useState<string>(permissionKeyName);

  const [canRead, setCanRead] = useState<boolean>(canReadPermission);
  const [canWrite, setCanWrite] = useState<boolean>(canWritePermission);

  const [commandBusinessInputValue, setCommandBusinessInputValue] =
    useState<CommandBusinessInputValue>({
      searchBusinessInputValue: business?.corporate_reason as string,
      businessId,
    });

  const [commandProfileAccessInputValue, setCommandProfileAccessInputValue] =
    useState<CommandProfileAccessInputValue>({
      searchProfileAccessInputValue: name,
      profileAccessId,
    });

  useEffect(() => {
    if (!isUpdatePermission) {
      setPermission(action);
      setPermissionKey(permissionKeyName);

      setCanRead(canReadPermission);
      setCanWrite(canWritePermission);

      setCommandBusinessInputValue({
        searchBusinessInputValue: business?.corporate_reason as string,
        businessId,
      });

      setCommandProfileAccessInputValue({
        searchProfileAccessInputValue: name,
        profileAccessId,
      });
    }
  }, [
    isUpdatePermission,
    permissionKeyName,
    action,
    canReadPermission,
    canWritePermission,
    business?.corporate_reason,
    businessId,
    name,
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
    commandBusinessInputValue.businessId !== businessId,
    commandProfileAccessInputValue.profileAccessId !== profileAccessId,
  ].some(Boolean);

  return {
    handleUpdatePermissionName,
    handleUpdateCanReadPermission,
    handleUpdateCanWritePermission,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchProfileAccessInputValue,
    commandProfileAccessInputValue,
    handleUpdatePermissionKeyName,
    commandBusinessInputValue,
    permissionKey,
    permission,
    canRead,
    canWrite,
    isDirty,
    formRef,
  };
}

export { useUpdatePermissionForm };
