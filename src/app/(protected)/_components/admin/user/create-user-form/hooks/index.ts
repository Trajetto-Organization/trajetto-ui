import { useEffect, useRef, useState } from "react";

import type { CreateUserFormState } from "../create-user-form.types";
import type {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
  CommandDriverInputValue,
} from "@/app/(protected)/_components/shared/common.types";

import { queryClientProps } from "@/lib/query-client-props";
import { revalidateTagName } from "@/actions/revalidate";

import { generateRandomPassword } from "@/lib/generate-random-password";
import { toast } from "sonner";

function useCreateUserForm(state: CreateUserFormState | null) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateUserForm, setIsCreateUserForm] = useState<boolean>(false);

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

  const [commandDriverInputValue, setCommandDriverInputValue] =
    useState<CommandDriverInputValue>({
      searchDriverInputValue: "",
      driverId: "",
      driverCnh: "",
    });

  const [userType, setUserType] = useState<"employee" | "driver">("employee");

  const handleUpdateSearchBusinessInputValue = ({
    searchBusinessInputValue,
    businessId,
  }: CommandBusinessInputValue) => {
    setCommandProfileAccessInputValue({
      searchProfileAccessInputValue: "",
      profileAccessId: "",
    });

    setCommandDriverInputValue({
      searchDriverInputValue: "",
      driverId: "",
      driverCnh: "",
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

  const handleUpdateSearchDriverInputValue = ({
    searchDriverInputValue,
    driverId,
    driverCnh,
  }: CommandDriverInputValue) => {
    const updateCommandInputValue =
      commandDriverInputValue.driverId === driverId
        ? { searchDriverInputValue: "", driverId: "", driverCnh: "" }
        : { searchDriverInputValue, driverId, driverCnh };

    setCommandDriverInputValue(updateCommandInputValue);
  };

  const handleOpenCreateUserForm = () => {
    if (isCreateUserForm) {
      formRef.current?.reset();

      setCommandBusinessInputValue({
        businessId: "",
        searchBusinessInputValue: "",
      });

      setCommandProfileAccessInputValue({
        profileAccessId: "",
        searchProfileAccessInputValue: "",
      });

      setCommandDriverInputValue({
        driverId: "",
        searchDriverInputValue: "",
        driverCnh: "",
      });

      setUserType("employee");
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
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchProfileAccessInputValue,
    handleUpdateSearchDriverInputValue,
    commandProfileAccessInputValue,
    commandBusinessInputValue,
    commandDriverInputValue,
    userType,
    setUserType,
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
