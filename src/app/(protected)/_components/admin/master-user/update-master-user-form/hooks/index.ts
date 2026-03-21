import { useEffect, useRef, useState } from "react";

import type { UpdateMasterUserFormState } from "../update-master-user-form.types";
import type { MasterUserProps } from "../../master-user.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { generateRandomPassword } from "@/lib/generate-random-password";
import { toast } from "sonner";

interface UseUpdateMasterUserFormProps {
  state: UpdateMasterUserFormState | null;
  handleOpenUpdateMasterUser: () => void;
  masterUserValues: MasterUserProps;
  isUpdateMasterUser: boolean;
}

function useUpdateMasterUserForm({
  state,
  handleOpenUpdateMasterUser,
  isUpdateMasterUser,
  masterUserValues: { email, name },
}: UseUpdateMasterUserFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [masterUserName, setMasterUserName] = useState<string>(name);
  const [masterUserEmail, setMasterUserEmail] = useState<string>(email);

  useEffect(() => {
    if (!isUpdateMasterUser) {
      setMasterUserName(name);
      setMasterUserEmail(email);
    }
  }, [isUpdateMasterUser, name, email]);

  const handleUpdateMasterUserName = (updatedName: string): void => {
    setMasterUserName(updatedName);
  };

  const handleUpdateMasterUserEmail = (updatedEmail: string): void => {
    setMasterUserEmail(updatedEmail);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.updateMasterUserError?.updateMasterUserErrorMessage) {
      toast.error(state.updateMasterUserError.updateMasterUserErrorMessage);
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
            revalidateTagName("update-master-user"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "master-user";

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
      handleOpenUpdateMasterUser();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleOpenUpdateMasterUser]);

  const isDirty = [masterUserName !== name, masterUserEmail !== email].some(
    Boolean,
  );

  return {
    handleUpdateMasterUserName,
    handleUpdateMasterUserEmail,
    masterUserName,
    masterUserEmail,
    formRef,
    isDirty,
  };
}

function useUpdateMasterUserGenerateRandomPassword() {
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

export { useUpdateMasterUserForm, useUpdateMasterUserGenerateRandomPassword };
