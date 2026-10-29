import { useState, useEffect, useRef, useCallback } from "react";

import { useQuery } from "react-query";
import { toast } from "sonner";

import { applyMask } from "@/lib/format-values";

import type { FieldProps, UseCepValidationProps } from "../shared/common.types";
import { businessFieldsData } from "../data";

const fetchCep = async (numericCep: string) => {
  const res = await fetch(`https://viacep.com.br/ws/${numericCep}/json/`);
  const data = await res.json();

  if (data.erro) throw new Error("CEP não encontrado");

  return {
    city: data.localidade || "",
    uf: data.uf || "",
    street: data.logradouro || "",
  };
};

function useCepQuery(cep: string) {
  const numericCep = cep.replace(/\D/g, "");
  return useQuery(["cep", numericCep], () => fetchCep(numericCep), {
    enabled: numericCep.length === 8, // Only runs if the zip code has 8 digits
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    keepPreviousData: false, // Don't keep previous CEP data when searching for a new one
  });
}

// Helper function to compute initial form values from initialData
const computeInitialFormValues = (
  initialData: UseCepValidationProps["initialData"],
): Record<string, string> => {
  const newValues: Record<string, string> = {};

  // First, include any extra fields from initialData that are not in businessFieldsData
  // This allows preserving custom fields like "name", "status", "contract_type" for drivers/suppliers
  if (initialData) {
    const businessFieldNames = businessFieldsData.map((f) => f.name);
    Object.keys(initialData).forEach((key) => {
      if (!businessFieldNames.includes(key)) {
        const value = initialData[key as keyof typeof initialData];
        if (value !== undefined && value !== null) {
          newValues[key] = value.toString();
        }
      }
    });
  }

  // Then process business fields with their masks
  businessFieldsData.forEach((field) => {
    let value =
      initialData?.[field.name as keyof typeof initialData]?.toString() || "";

    if (field.mask) value = applyMask(value, field.mask);
    newValues[field.name] = value;
  });

  return newValues;
};

function useCepValidation({
  initialData,
  isOpen,
  originalData,
}: UseCepValidationProps) {
  // Use lazy initializer to compute initial values immediately on mount
  // This prevents empty values on first render when component remounts
  const [formValues, setFormValues] = useState<Record<string, string>>(() =>
    computeInitialFormValues(initialData),
  );

  // For isDirty comparison, use originalData if provided (multi-step forms),
  // otherwise use initialData (single-step forms like branch)
  const dataForDirtyComparison = originalData ?? initialData;
  const initialFormValuesRef = useRef(
    computeInitialFormValues(dataForDirtyComparison),
  );

  const toastIdRef = useRef<string | number | null>(null);
  const lastSuccessfulCepRef = useRef<string>("");

  // The CEP the form was seeded with (digits only). Its lookup only confirms
  // the CEP still resolves; the seeded address is never overwritten by it.
  const prefilledCepRef = useRef<string>("");

  // Track CEPs that have already shown success toast
  const hasShownToastForCepRef = useRef<Set<string>>(new Set());
  // Track CEPs that have already shown loading toast (to prevent duplicate loading toasts)
  const hasShownLoadingToastForCepRef = useRef<Set<string>>(new Set());

  // Track if the form was just reset (dialog closed and reopened)
  const previousIsOpenRef = useRef<boolean | undefined>(undefined);

  // Handle changes to initialData while component is mounted
  // and reset state when form is reopened
  useEffect(() => {
    const newValues = computeInitialFormValues(initialData);

    setFormValues(newValues);

    // Only reset toast tracking when the dialog is reopened (was closed, now open)
    // This prevents clearing tracking when just navigating between steps
    const wasDialogReopened =
      previousIsOpenRef.current === false && isOpen === true;

    // Only update initialFormValuesRef when dialog is reopened
    // Use originalData if provided (for multi-step forms), otherwise use initialData
    if (wasDialogReopened) {
      const valuesForDirtyComparison = computeInitialFormValues(
        originalData ?? initialData,
      );
      initialFormValuesRef.current = valuesForDirtyComparison;
      hasShownToastForCepRef.current.clear();
      hasShownLoadingToastForCepRef.current.clear();
    }

    previousIsOpenRef.current = isOpen;

    // Add initial CEP to success toast tracking so we don't show "CEP encontrado!" for pre-filled CEPs
    // But DON'T add to loading toast tracking - we want to show "Procurando CEP..."
    // when opening edit dialog so user understands why fields are disabled
    const initialCep = newValues.cep?.replace(/\D/g, "") || "";
    prefilledCepRef.current = initialCep;

    if (initialCep.length === 8) {
      hasShownToastForCepRef.current.add(initialCep);
      // Note: NOT adding to hasShownLoadingToastForCepRef so loading toast shows on dialog open
      lastSuccessfulCepRef.current = initialCep;
    }
  }, [initialData, isOpen, originalData]);

  const cepValue = formValues["cep"] || "";
  const numericCep = cepValue.replace(/\D/g, "");

  const {
    data: cepData,
    isFetching: cepFetching,
    isError: cepError,
    isSuccess: cepSuccess,
  } = useCepQuery(cepValue);

  // Track which CEP the current data belongs to
  const lastFetchedCepRef = useRef<string>("");

  // If the modal is closed, it ensures that the loading toast is discarded
  useEffect(() => {
    if (!isOpen && toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, [isOpen]);

  // Triggers the loading toast when the zip code is being searched
  // Only show if we haven't shown a loading toast for this CEP before
  useEffect(() => {
    if (
      cepFetching &&
      !toastIdRef.current &&
      !hasShownLoadingToastForCepRef.current.has(numericCep)
    ) {
      toastIdRef.current = toast.loading("Procurando o CEP...");
      hasShownLoadingToastForCepRef.current.add(numericCep);
    }
  }, [cepFetching, numericCep]);

  useEffect(() => {
    if (!cepFetching && toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }

    // Only process success if we're not fetching and this is a successful response for the current CEP
    if (!cepFetching && cepSuccess && cepData && numericCep.length === 8) {
      // Track the CEP that was successfully fetched
      lastFetchedCepRef.current = numericCep;

      const initial = initialFormValuesRef.current;
      const initialCepDigits = (initial.cep || "").replace(/\D/g, "");

      if (numericCep === initialCepDigits) {
        // Typing the record's own CEP back restores the address it was
        // saved with (on open this is a no-op), so an untouched form
        // compares clean again and the update button disables itself.
        setFormValues((prev) => ({
          ...prev,
          city: initial.city ?? prev.city,
          uf: initial.uf ?? prev.uf,
          street: initial.street ?? prev.street,
        }));
      } else if (numericCep !== prefilledCepRef.current) {
        // Only a CEP the user actually changed to is filled from the
        // lookup. Overwriting on open would replace an address the record
        // was saved with -- hand-corrected, or declared by the NF-e --
        // with ViaCEP's version and mark the form dirty before any edit.
        setFormValues((prev) => ({
          ...prev,
          city: cepData.city,
          uf: cepData.uf,
          street: cepData.street,
        }));
      }

      // Only show toast if we haven't shown it for this CEP before
      if (!hasShownToastForCepRef.current.has(numericCep)) {
        toast.success("CEP encontrado!");

        hasShownToastForCepRef.current.add(numericCep);
        lastSuccessfulCepRef.current = numericCep;
      }
    }

    // Only show error if not fetching (query completed with error)
    if (!cepFetching && cepError && numericCep.length === 8) {
      toast.error("CEP inválido! Preencha manualmente");
      // Remove from loading toast tracking so the toast shows again if user types the same CEP
      hasShownLoadingToastForCepRef.current.delete(numericCep);
      lastSuccessfulCepRef.current = "";
    }
  }, [cepFetching, cepSuccess, cepData, cepError, numericCep]);

  const handleFieldChange = useCallback((name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Checks if the form has been modified (dirty)
  const isDirty = Object.keys(initialFormValuesRef.current).some(
    (key) => initialFormValuesRef.current[key] !== formValues[key],
  );

  // Updates the fields considering the list of mandatory fields
  const updatedFields: FieldProps[] = businessFieldsData.map((field) => ({
    ...field,
    value: formValues[field.name] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      handleFieldChange(field.name, e.target.value),
    disabled:
      field.disabled ||
      (["cep", "street", "uf", "city"].includes(field.name) && cepFetching),
  }));

  return {
    updatedFields,
    formValues,
    cepLoading: cepFetching,
    isDirty,
    handleFieldChange,
  };
}

export { useCepValidation };
