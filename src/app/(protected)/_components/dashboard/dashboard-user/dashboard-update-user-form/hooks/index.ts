import { useEffect, useRef, useState } from "react";
import { CommandProfileAccessInputValue } from "@/app/(protected)/_components/dto";

import { DashboardUpdateUserFormState } from "../dto";
import { DashboardUserRegistrationProps } from "../../dto";

import { toast } from "sonner";
import { generateRandomPassword } from "@/lib/generate-random-password";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

interface UseDashboardUpdateUserFormProps {
  state: DashboardUpdateUserFormState | null;
  handleOpenUpdateUser: () => void;
  userValues: DashboardUserRegistrationProps;
  isUpdateUser: boolean;
}

function useDashboardUpdateUserForm({
  state,
  handleOpenUpdateUser,
  isUpdateUser,
  userValues: { businessId, profileAccessId, profileAccess, email, name, role },
}: UseDashboardUpdateUserFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [userName, setUserName] = useState<string>(name);
  const [userEmail, setUserEmail] = useState<string>(email);

  const [userRole, setUserRole] = useState<string>(role);

  const [commandProfileAccessInputValue, setCommandProfileAccessInputValue] =
    useState<CommandProfileAccessInputValue>({
      searchProfileAccessInputValue:
        profileAccess === "N/A" ? "" : profileAccess,
      profileAccessId: profileAccess === "N/A" ? "" : profileAccessId,
    });

  useEffect(() => {
    if (!isUpdateUser) {
      setUserName(name);
      setUserEmail(email);

      setUserRole(role);

      setCommandProfileAccessInputValue({
        searchProfileAccessInputValue:
          profileAccess === "N/A" ? "" : profileAccess,
        profileAccessId: profileAccess === "N/A" ? "" : profileAccessId,
      });
    }
  }, [
    businessId,
    profileAccessId,
    profileAccess,
    isUpdateUser,
    name,
    email,
    role,
  ]);

  const handleUpdateUserName = (updatedUserName: string): void => {
    setUserName(updatedUserName);
  };

  const handleUpdateUserEmail = (updatedUserEmail: string): void => {
    setUserEmail(updatedUserEmail);
  };

  const handleUpdateUserRole = (updatedUserRole: string) => {
    setUserRole(updatedUserRole);
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

  useEffect(() => {
    // Handle error case first
    if (state?.updateUserError?.updateUserErrorMessage) {
      toast.error(state.updateUserError.updateUserErrorMessage);
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
            revalidateTagName("update-user-registration"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) && query.queryKey[0] === "user";

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
      handleOpenUpdateUser();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleOpenUpdateUser]);

  const isDirty = [
    userName !== name,
    userEmail !== email,
    userRole !== role,
    profileAccess === "N/A"
      ? commandProfileAccessInputValue.profileAccessId !== ""
      : commandProfileAccessInputValue.profileAccessId !== profileAccessId,
  ].some(Boolean);

  return {
    handleUpdateSearchProfileAccessInputValue,
    commandProfileAccessInputValue,
    handleUpdateUserName,
    handleUpdateUserEmail,
    handleUpdateUserRole,
    userName,
    userEmail,
    userRole,
    formRef,
    isDirty,
  };
}

function useUpdateGenerateRandomPassword() {
  const [password, setPassword] = useState<string>("");

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword(10);

    setPassword(newPassword);
    toast.success("Senha gerada com sucesso!");
  };

  const handleChangePassword = (newPassword: string) => {
    setPassword(newPassword);
  };

  return {
    handleGeneratePassword,
    handleChangePassword,
    password,
  };
}

export { useDashboardUpdateUserForm, useUpdateGenerateRandomPassword };
