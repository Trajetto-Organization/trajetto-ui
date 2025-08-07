"use server";

import { createUpdateSupplierSchema } from "@/schemas/create-update-supplier-schema";
import { getCookies } from "../cookies";

interface UpdateSupplierProps {
  message: string;
}

const handleUpdateSupplier = async (
  state: any,
  updateSupplierValues: FormData,
) => {
  if (updateSupplierValues.type === "RESET") {
    return {};
  }

  const businessId = updateSupplierValues.get("businessId");
  const supplierId = updateSupplierValues.get("supplierId");

  const updateSupplier = `${process.env.HTTP_REQUEST}/supplier/update-supplier/${supplierId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  const supplierValues = Object.fromEntries(updateSupplierValues.entries());
  const updateSupplierValidation =
    createUpdateSupplierSchema.safeParse(supplierValues);

  if (updateSupplierValidation.error) {
    const formatError = updateSupplierValidation.error.flatten();

    return {
      updateSupplierError: formatError.fieldErrors,
    };
  }

  const supplierData = updateSupplierValidation.data;

  try {
    const response = await fetch(updateSupplier, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(supplierData),
    });

    const { message } = (await response.json()) as UpdateSupplierProps;

    if (!response.ok && message) {
      return {
        updateSupplierError: { updateSupplierErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateSupplierError: {
        updateSupplierErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o fornecedor.",
      },
    };
  }
};

export { handleUpdateSupplier };
