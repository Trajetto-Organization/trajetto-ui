import { useEffect, useRef, useState } from "react";

import type { CommandSupplierInputValue } from "@/app/(protected)/_components/shared/common.types";
import type { DashboardCreatePartFormState } from "../dashboard-create-part-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { toast } from "sonner";

function useDashboardCreatePartForm(
  state: DashboardCreatePartFormState | null,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreatePartForm, setIsCreatePartForm] = useState<boolean>(false);
  const [displayUnitPrice, setDisplayUnitPrice] = useState<string>("");

  const [commandSupplierInputValue, setCommandSupplierInputValue] =
    useState<CommandSupplierInputValue>({
      searchSupplierInputValue: "",
      supplierId: "",
    });

  const handleUnitPriceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    let inputValue = e.target.value;

    // Removes any character other than a digit, comma, or period
    // Note that we removed the \s from the regular expression to eliminate the spaces.
    inputValue = inputValue.replace(/[^\d,.]/g, "");
    setDisplayUnitPrice(inputValue);
  };

  const handleUnitPriceBlur = (): void => {
    if (
      !displayUnitPrice ||
      displayUnitPrice === "," ||
      displayUnitPrice === "."
    ) {
      setDisplayUnitPrice("");

      return;
    }

    const newNumericValue = formatCurrencyToNumber(displayUnitPrice);

    setDisplayUnitPrice(formatToBrazilianCurrency(newNumericValue));
  };

  const handleUpdateSearchSupplierInputValue = ({
    searchSupplierInputValue,
    supplierId,
  }: CommandSupplierInputValue) => {
    const updateCommandInputValue =
      commandSupplierInputValue.supplierId === supplierId
        ? { searchSupplierInputValue: "", supplierId: "" }
        : { searchSupplierInputValue, supplierId };

    setCommandSupplierInputValue(updateCommandInputValue);
  };

  const handleOpenCreatePartForm = () => {
    setIsCreatePartForm(!isCreatePartForm);

    if (isCreatePartForm) {
      formRef.current?.reset();

      setCommandSupplierInputValue({
        supplierId: "",
        searchSupplierInputValue: "",
      });

      setDisplayUnitPrice("");
    }
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createPartError?.createPartErrorMessage) {
      toast.error(state.createPartError.createPartErrorMessage);
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
            revalidateTagName("create-part"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) && query.queryKey[0] === "part";

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
      handleOpenCreatePartForm();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    isCreatePartForm,
    handleOpenCreatePartForm,
    commandSupplierInputValue,
    handleUpdateSearchSupplierInputValue,
    formRef,
    displayUnitPrice,
    handleUnitPriceChange,
    handleUnitPriceBlur,
  };
}

export { useDashboardCreatePartForm };
