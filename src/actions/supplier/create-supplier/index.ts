"use server";

import { createUpdateSupplierSchema } from "@/schemas/create-update-supplier-schema";
import { getCookies } from "../../cookies";

interface CreateSupplierProps {
  message: string;
}

const handleCreateSupplier = async (
  state: any,
  createSupplierValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createSupplierError: {
        createSupplierErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createSupplierValues.type === "RESET") {
    return {};
  }

  const businessId = createSupplierValues.get("businessId");

  if (!businessId) {
    return {
      createBranchError: {
        businessId: ["Selecione uma empresa para continuar"],
      },
    };
  }

  const createSupplier = `${process.env.HTTP_REQUEST}/supplier/create-supplier/${businessId}`;

  const branchValues = Object.fromEntries(createSupplierValues.entries());
  const createSupplierValidation =
    createUpdateSupplierSchema.safeParse(branchValues);

  if (createSupplierValidation.error) {
    const formatError = createSupplierValidation.error.flatten();

    return {
      createSupplierError: formatError.fieldErrors,
    };
  }

  const supplierData = createSupplierValidation.data;

  try {
    const response = await fetch(createSupplier, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(supplierData),
    });

    const { message } = (await response.json()) as CreateSupplierProps;

    if (!response.ok && message) {
      return {
        createSupplierError: { createSupplierErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createSupplierError: {
        createSupplierErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o fornecedor.",
      },
    };
  }
};

export { handleCreateSupplier };
