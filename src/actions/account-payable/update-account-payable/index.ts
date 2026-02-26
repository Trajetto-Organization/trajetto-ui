"use server";

import { createUpdateAccountPayableSchema } from "@/schemas/create-update-account-payable-schema";
import { getCookies } from "../../cookies";

interface UpdateAccountPayableProps {
  message: string;
}

const handleUpdateAccountPayable = async (
  state: any,
  updateAccountPayableValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateAccountPayableError: {
        updateAccountPayableErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateAccountPayableValues.type === "RESET") {
    return {};
  }

  const businessId = updateAccountPayableValues.get("businessId");
  const accountPayableId = updateAccountPayableValues.get("accountPayableId");

  const updateAccountPayable = `${process.env.HTTP_REQUEST}/account-payable/update-account-payable/${accountPayableId}/business/${businessId}`;

  const accountPayableValues = Object.fromEntries(
    updateAccountPayableValues.entries(),
  );

  const updateAccountPayableValidation =
    createUpdateAccountPayableSchema.safeParse(accountPayableValues);

  if (updateAccountPayableValidation.error) {
    const formatError = updateAccountPayableValidation.error.flatten();

    return {
      updateAccountPayableError: formatError.fieldErrors,
    };
  }

  const accountPayableData = updateAccountPayableValidation.data;

  try {
    const response = await fetch(updateAccountPayable, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(accountPayableData),
    });

    const { message } = (await response.json()) as UpdateAccountPayableProps;

    if (!response.ok && message) {
      return {
        updateAccountPayableError: {
          updateAccountPayableErrorMessage: message,
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateAccountPayableError: {
        updateAccountPayableErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar uma conta a pagar.",
      },
    };
  }
};

export { handleUpdateAccountPayable };
