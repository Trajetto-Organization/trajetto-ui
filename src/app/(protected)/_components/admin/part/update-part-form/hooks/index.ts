import { useEffect, useRef, useState } from "react";
import {
  CommandBusinessInputValue,
  CommandSupplierInputValue,
} from "@/app/(protected)/_components/dto";

import { UpdatePartFormState } from "../dto";
import { PartProps } from "../../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { queryClientProps } from "@/lib/query-client-props";

interface UseUpdatePartFormProps {
  state: UpdatePartFormState | null;
  handleCloseUpdatePart: () => void;
  partValues: PartProps;
  isUpdatePartOpen: boolean;
}

function useUpdatePartForm({
  state,
  handleCloseUpdatePart,
  isUpdatePartOpen,
  partValues: {
    description: partDescription,
    unit_price: partPrice,
    businessId,
    supplierId,
    supplier,
    business,
  },
}: UseUpdatePartFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [description, setDescription] = useState<string>(partDescription);

  // Status for displayed value (formatted)
  const [displayUnitPrice, setDisplayUnitPrice] = useState<string>(
    formatToBrazilianCurrency(partPrice),
  );

  // State for numeric value
  const [numericUnitPrice, setNumericUnitPrice] = useState<number>(
    formatCurrencyToNumber(partPrice),
  );

  // Original value for comparison in isDirty
  const [originalNumericPrice, setOriginalNumericPrice] = useState<number>(
    formatCurrencyToNumber(partPrice),
  );

  const [commandBusinessInputValue, setCommandBusinessInputValue] =
    useState<CommandBusinessInputValue>({
      searchBusinessInputValue: business?.corporate_reason || "",
      businessId: businessId || "",
    });

  const [commandSupplierInputValue, setCommandSupplierInputValue] =
    useState<CommandSupplierInputValue>({
      searchSupplierInputValue: supplier?.name || "",
      supplierId: supplierId || "",
    });

  const handleUpdateSearchBusinessInputValue = ({
    searchBusinessInputValue,
    businessId,
  }: CommandBusinessInputValue) => {
    setCommandSupplierInputValue({
      searchSupplierInputValue: "",
      supplierId: "",
    });

    const updateCommandInputValue =
      commandBusinessInputValue.businessId === businessId
        ? { searchBusinessInputValue: "", businessId: "" }
        : { searchBusinessInputValue, businessId };

    setCommandBusinessInputValue(updateCommandInputValue);
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

  useEffect(() => {
    if (!isUpdatePartOpen) {
      setDescription(partDescription);

      // Reset price values ​​when modal opens/closes
      const numericPrice = formatCurrencyToNumber(partPrice);

      setNumericUnitPrice(numericPrice);
      setOriginalNumericPrice(numericPrice);

      setDisplayUnitPrice(formatToBrazilianCurrency(numericPrice));

      setCommandBusinessInputValue({
        searchBusinessInputValue: business?.corporate_reason || "",
        businessId: businessId || "",
      });

      setCommandSupplierInputValue({
        searchSupplierInputValue: supplier?.name || "",
        supplierId: supplierId || "",
      });
    }
  }, [
    isUpdatePartOpen,
    partDescription,
    partPrice,
    supplierId,
    supplier?.name,
    business?.corporate_reason,
    businessId,
  ]);

  useEffect(() => {
    // Handle error case first
    if (state?.updatePartError?.updatePartErrorMessage) {
      toast.error(state.updatePartError.updatePartErrorMessage);
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
            revalidateTagName("update-part"),
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
      handleCloseUpdatePart();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdatePart]);

  const handleUpdateDescription = (updatedDescription: string): void => {
    setDescription(updatedDescription);
  };

  // Change handler for price field
  const handleUnitPriceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    let inputValue = e.target.value;

    inputValue = inputValue.replace(/[^\d,.]/g, "");
    setDisplayUnitPrice(inputValue);

    // Convert to number
    if (inputValue && inputValue !== "," && inputValue !== ".") {
      const newNumericValue = formatCurrencyToNumber(inputValue);
      setNumericUnitPrice(newNumericValue);
    } else {
      setNumericUnitPrice(0);
    }
  };

  // Focus loss handler for price field
  const handleUnitPriceBlur = (): void => {
    if (
      !displayUnitPrice ||
      displayUnitPrice === "," ||
      displayUnitPrice === "."
    ) {
      setDisplayUnitPrice("");
      setNumericUnitPrice(0);
      return;
    }

    const newNumericValue = formatCurrencyToNumber(displayUnitPrice);

    setNumericUnitPrice(newNumericValue);
    setDisplayUnitPrice(formatToBrazilianCurrency(newNumericValue));
  };

  // Check if values ​​have changed
  const isDirty = [
    description !== partDescription,
    Math.abs(numericUnitPrice - originalNumericPrice) > 0.001, // Comparing with tolerance for float
    commandBusinessInputValue.businessId !== (businessId || ""),
    (supplier?.name || "") !==
      commandSupplierInputValue.searchSupplierInputValue,
  ].some(Boolean);

  return {
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchSupplierInputValue,
    commandBusinessInputValue,
    commandSupplierInputValue,
    handleUpdateDescription,
    handleUnitPriceChange,
    handleUnitPriceBlur,
    description,
    displayUnitPrice,
    numericUnitPrice,
    formRef,
    isDirty,
  };
}

export { useUpdatePartForm };
