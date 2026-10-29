"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateSupplierSchema } from "@/schemas/create-update-supplier-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface UpdateSupplierProps {
  message: string;
}

const handleUpdateSupplier = async (
  state: any,
  updateSupplierValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateSupplierError: {
        updateSupplierErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateSupplierValues.type === "RESET") {
    return {};
  }

  const businessId = updateSupplierValues.get("businessId");
  const supplierId = updateSupplierValues.get("supplierId");

  const updateSupplier = `${process.env.HTTP_REQUEST}/supplier/update-supplier/${supplierId}/business/${businessId}`;

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
    const response = await apiFetch(updateSupplier, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(supplierData),
    });

    const { message } = (await response.json()) as UpdateSupplierProps;

    if (!response.ok) {
      return {
        updateSupplierError: {
          updateSupplierErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-supplier");

    return { successMessage: message };
  } catch (error) {
    logActionError("supplier/update-supplier", error);
    return {
      updateSupplierError: {
        updateSupplierErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o fornecedor.",
      },
    };
  }
};

export { handleUpdateSupplier };
