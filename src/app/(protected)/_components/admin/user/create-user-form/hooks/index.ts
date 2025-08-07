import { useEffect, useRef, useState } from "react";
import { CreateUserFormState } from "../dto";

import {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
} from "../../../../dto";

import { generateRandomPassword } from "@/lib/generate-random-password";
import { revalidateTagName } from "@/actions/revalidate";

import { toast } from "sonner";
import { queryClientProps } from "@/lib/query-client-props";

function useCreateUserForm(state: CreateUserFormState | null) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateUserForm, setIsCreateUserForm] = useState<boolean>(false);

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

  const handleOpenCreateUserForm = () => {
    if (isCreateUserForm) {
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

    setIsCreateUserForm(!isCreateUserForm);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createUserError?.createUserErrorMessage) {
      toast.error(state.createUserError.createUserErrorMessage);
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
            revalidateTagName("create-user-registration"),
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
      handleOpenCreateUserForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateUserForm,
    handleOpenCreateUserForm,
    handleUpdateSearchBussinessInputValue,
    handleUpdateSearchProfileAccessInputValue,
    commandProfileAccessInputValue,
    commandBusinnessInputValue,
    formRef,
  };
}

function useSelectUserRole() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  return {
    selectedRole,
    setSelectedRole,
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

export { useCreateUserForm, useGenerateRandomPassword, useSelectUserRole };
