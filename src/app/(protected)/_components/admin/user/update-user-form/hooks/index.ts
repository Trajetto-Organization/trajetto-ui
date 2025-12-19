import { useEffect, useRef, useState } from "react";
import {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
  CommandDriverInputValue,
} from "../../../../dto";

import { UpdateUserFormState } from "../dto";
import { UserRegistrationProps } from "../../dto";

import { toast } from "sonner";
import { generateRandomPassword } from "@/lib/generate-random-password";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

interface UseUpdateUserFormProps {
  state: UpdateUserFormState | null;
  handleOpenUpdateUser: () => void;
  userValues: UserRegistrationProps;
  isUpdateUser: boolean;
}

function useUpdateUserForm({
  state,
  handleOpenUpdateUser,
  isUpdateUser,
  userValues: {
    businessId,
    profileAccessId,
    profileAccess,
    driverId,
    driverName,
    corporate_reason,
    email,
    name,
    role,
  },
}: UseUpdateUserFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [userName, setUserName] = useState<string>(name);
  const [userEmail, setUserEmail] = useState<string>(email);

  const [userRole, setUserRole] = useState<string>(role);

  const [commandBusinessInputValue, setCommandBusinessInputValue] =
    useState<CommandBusinessInputValue>({
      searchBusinessInputValue: corporate_reason as string,
      businessId,
    });

  const [commandProfileAccessInputValue, setCommandProfileAccessInputValue] =
    useState<CommandProfileAccessInputValue>({
      searchProfileAccessInputValue:
        profileAccess === "N/A" ? "" : profileAccess,
      profileAccessId: profileAccess === "N/A" ? "" : profileAccessId,
    });

  const [commandDriverInputValue, setCommandDriverInputValue] =
    useState<CommandDriverInputValue>({
      searchDriverInputValue:
        driverName && driverName !== "N/A" ? driverName : "",
      driverId: driverId && driverId !== "N/A" ? driverId : "",
      driverCnh: "",
    });

  const [userType, setUserType] = useState<"employee" | "driver">(
    driverId && driverId.trim() !== "" && driverId !== "N/A"
      ? "driver"
      : "employee",
  );

  useEffect(() => {
    if (!isUpdateUser) {
      setUserName(name);
      setUserEmail(email);

      setUserRole(role);

      setCommandBusinessInputValue({
        searchBusinessInputValue: corporate_reason as string,
        businessId,
      });

      setCommandProfileAccessInputValue({
        searchProfileAccessInputValue:
          profileAccess === "N/A" ? "" : profileAccess,
        profileAccessId: profileAccess === "N/A" ? "" : profileAccessId,
      });

      setCommandDriverInputValue({
        searchDriverInputValue:
          driverName && driverName !== "N/A" ? driverName : "",
        driverId: driverId && driverId !== "N/A" ? driverId : "",
        driverCnh: "",
      });

      setUserType(
        driverId && driverId.trim() !== "" && driverId !== "N/A"
          ? "driver"
          : "employee",
      );
    }
  }, [
    corporate_reason,
    businessId,
    profileAccessId,
    profileAccess,
    driverId,
    driverName,
    isUpdateUser,
    name,
    email,
    role,
  ]);

  const handleUpdateSearchBusinessInputValue = ({
    searchBusinessInputValue,
    businessId,
  }: CommandBusinessInputValue) => {
    if (userRole !== "BUSINESS_ADMIN") {
      setCommandProfileAccessInputValue({
        searchProfileAccessInputValue: "",
        profileAccessId: "",
      });

      setCommandDriverInputValue({
        searchDriverInputValue: "",
        driverId: "",
        driverCnh: "",
      });
    }

    const updateCommandInputValue =
      commandBusinessInputValue.businessId === businessId
        ? { searchBusinessInputValue: "", businessId: "" }
        : { searchBusinessInputValue, businessId };

    setCommandBusinessInputValue(updateCommandInputValue);
  };

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
    commandBusinessInputValue.businessId !== businessId,
    profileAccess === "N/A"
      ? commandProfileAccessInputValue.profileAccessId !== ""
      : commandProfileAccessInputValue.profileAccessId !== profileAccessId,
    driverId && driverId !== "N/A"
      ? commandDriverInputValue.driverId !== driverId
      : commandDriverInputValue.driverId !== "",
  ].some(Boolean);

  return {
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchProfileAccessInputValue,
    handleUpdateSearchDriverInputValue,
    commandProfileAccessInputValue,
    commandBusinessInputValue,
    commandDriverInputValue,
    handleUpdateUserName,
    handleUpdateUserEmail,
    handleUpdateUserRole,
    userName,
    userEmail,
    userRole,
    userType,
    setUserType,
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

export { useUpdateUserForm, useUpdateGenerateRandomPassword };
