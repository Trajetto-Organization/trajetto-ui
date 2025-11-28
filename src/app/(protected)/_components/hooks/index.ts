import { useState, useEffect, useRef, useCallback } from "react";

import { useQuery } from "react-query";
import { toast } from "sonner";

import { FieldProps, businessFieldsData } from "./business-fields-data";
import { UseCepValidationProps } from "./dto";

const applyMask = (value: string, mask: string): string => {
  let masked = "";
  let valueIndex = 0;

  const cleanedValue = value.replace(/\D/g, "");

  for (let i = 0; i < mask.length; i++) {
    const maskChar = mask[i];
    if (maskChar === "9") {
      masked += cleanedValue[valueIndex] || "";
      valueIndex++;
    } else {
      masked += maskChar;
    }
  }

  return masked;
};

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
  });
}

function useCepValidation({ initialData, isOpen }: UseCepValidationProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const initialFormValuesRef = useRef(formValues);

  const toastIdRef = useRef<string | number | null>(null);
  const lastSuccessfulCepRef = useRef<string>("");

  const hasShownToastForCepRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newValues: Record<string, string> = {};
    businessFieldsData.forEach((field) => {
      let value = (
        initialData?.[field.name as keyof typeof initialData]?.toString() || ""
      ).replace("N/A", "");

      if (field.mask) value = applyMask(value, field.mask);
      newValues[field.name] = value;
    });

    setFormValues(newValues);
    initialFormValuesRef.current = newValues;

    // Reset toast tracking when form resets
    hasShownToastForCepRef.current.clear();
    const initialCep = newValues.cep?.replace(/\D/g, "") || "";
    if (initialCep.length === 8) {
      hasShownToastForCepRef.current.add(initialCep);
      lastSuccessfulCepRef.current = initialCep;
    }
  }, [initialData, isOpen]);

  const cepValue = formValues["cep"] || "";
  const numericCep = cepValue.replace(/\D/g, "");

  const {
    data: cepData,
    isLoading: cepLoading,
    isError: cepError,
  } = useCepQuery(cepValue);

  // If the modal is closed, it ensures that the loading toast is discarded
  useEffect(() => {
    if (!isOpen && toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, [isOpen]);

  // Triggers the loading toast when the zip code is being searched
  useEffect(() => {
    if (cepLoading && !toastIdRef.current) {
      toastIdRef.current = toast.loading("Procurando o CEP...");
    }
  }, [cepLoading]);

  useEffect(() => {
    if (!cepLoading && toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }

    if (!cepLoading && cepData && numericCep.length === 8) {
      setFormValues((prev) => ({
        ...prev,
        city: cepData.city,
        uf: cepData.uf,
        street: cepData.street,
      }));

      // Only show toast if we haven't shown it for this CEP before
      if (!hasShownToastForCepRef.current.has(numericCep)) {
        toast.success("CEP encontrado!");

        hasShownToastForCepRef.current.add(numericCep);
        lastSuccessfulCepRef.current = numericCep;
      }
    }

    if (cepError) {
      toast.error("CEP inválido! Preencha manualmente");
      // Don't clear the tracking set on error, just reset lastSuccessful
      lastSuccessfulCepRef.current = "";
    }
  }, [cepLoading, cepData, cepError, numericCep]);

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
      (["cep", "street", "uf", "city"].includes(field.name) && cepLoading),
  }));

  return {
    updatedFields,
    formValues,
    cepLoading,
    isDirty,
    handleFieldChange,
  };
}

export { useCepValidation };
