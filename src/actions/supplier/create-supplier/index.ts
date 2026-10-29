"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateSupplierSchema } from "@/schemas/create-update-supplier-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

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
      // Under the key the form reads: it used to answer as a branch error,
      // which no supplier form displays.
      createSupplierError: {
        createSupplierErrorMessage: "Selecione uma empresa para continuar.",
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
    const response = await apiFetch(createSupplier, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(supplierData),
    });

    const { message } = (await response.json()) as CreateSupplierProps;

    if (!response.ok) {
      return {
        createSupplierError: {
          createSupplierErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("create-supplier");

    return { successMessage: message };
  } catch (error) {
    logActionError("supplier/create-supplier", error);
    return {
      createSupplierError: {
        createSupplierErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o fornecedor.",
      },
    };
  }
};

export { handleCreateSupplier };
