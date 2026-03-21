import { useEffect, useRef, useState } from "react";

import type { CommandBusinessInputValue } from "@/app/(protected)/_components/shared/common.types";
import type { CreateFuelTypeFormState } from "../create-fuel-type-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

function useCreateFuelTypeForm(state: CreateFuelTypeFormState | null) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateFuelTypeForm, setIsCreateFuelTypeForm] =
    useState<boolean>(false);

  const [commandBusinnessInputValue, setCommandBussinessInputValue] =
    useState<CommandBusinessInputValue>({
      searchBusinessInputValue: "",
      businessId: "",
    });

  const handleUpdateSearchBussinessInputValue = ({
    searchBusinessInputValue,
    businessId,
  }: CommandBusinessInputValue) => {
    const updateCommandInputValue =
      commandBusinnessInputValue.businessId === businessId
        ? { searchBusinessInputValue: "", businessId: "" }
        : { searchBusinessInputValue, businessId };

    setCommandBussinessInputValue(updateCommandInputValue);
  };

  const handleOpenCreateFuelTypeForm = () => {
    setIsCreateFuelTypeForm(!isCreateFuelTypeForm);

    if (isCreateFuelTypeForm) {
      formRef.current?.reset();

      setCommandBussinessInputValue({
        businessId: "",
        searchBusinessInputValue: "",
      });
    }
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createFuelTypeError?.createFuelTypeErrorMessage) {
      toast.error(state.createFuelTypeError.createFuelTypeErrorMessage);
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
            revalidateTagName("create-fuel-type"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "fuel_type";

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
      handleOpenCreateFuelTypeForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreateFuelTypeForm,
    handleOpenCreateFuelTypeForm,
    commandBusinnessInputValue,
    handleUpdateSearchBussinessInputValue,
    formRef,
  };
}

export { useCreateFuelTypeForm };
