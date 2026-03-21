import { useEffect, useRef, useState } from "react";

import type { CreateMasterUserFormState } from "../create-master-user-form.types";

import { queryClientProps } from "@/lib/query-client-props";
import { revalidateTagName } from "@/actions/revalidate";

import { generateRandomPassword } from "@/lib/generate-random-password";
import { toast } from "sonner";

function useCreateMasterUserForm(state: CreateMasterUserFormState | null) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateMasterUserForm, setIsCreateMasterUserForm] =
    useState<boolean>(false);

  const handleOpenCreateMasterUserForm = () => {
    if (isCreateMasterUserForm) {
      formRef.current?.reset();
    }

    setIsCreateMasterUserForm(!isCreateMasterUserForm);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createMasterUserError?.createMasterUserErrorMessage) {
      toast.error(state.createMasterUserError.createMasterUserErrorMessage);
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
            revalidateTagName("create-master-user"),
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
      handleOpenCreateMasterUserForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateMasterUserForm,
    handleOpenCreateMasterUserForm,
    formRef,
  };
}

function useGenerateRandomPassword() {
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

export { useCreateMasterUserForm, useGenerateRandomPassword };
