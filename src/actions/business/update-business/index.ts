"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateBusinessFormSchema } from "@/schemas/create-update-business-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface UpdateBusinessProps {
  message: string;
}

const handleUpdateBusiness = async (
  state: any,
  updateBusinessValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateBusinessError: {
        updateBusinessErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateBusinessValues.type === "RESET") {
    return {};
  }

  const businessId = updateBusinessValues.get("businessId");
  const updateBusiness = `${process.env.HTTP_REQUEST}/business/update-business/${businessId}`;

  const businessValues = Object.fromEntries(updateBusinessValues.entries());
  const updateBusinessValidation =
    createUpdateBusinessFormSchema.safeParse(businessValues);

  if (updateBusinessValidation.error) {
    const formatError = updateBusinessValidation.error.flatten();

    return {
      updateBusinessError: formatError.fieldErrors,
    };
  }

  const businessData = updateBusinessValidation.data;

  try {
    const response = await apiFetch(updateBusiness, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(businessData),
    });

    const { message } = (await response.json()) as UpdateBusinessProps;

    if (!response.ok) {
      return {
        updateBusinessError: {
          updateBusinessErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("business/update-business", error);
    return {
      updateBusinessError: {
        updateBusinessErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a empresa.",
      },
    };
  }
};

export { handleUpdateBusiness };
