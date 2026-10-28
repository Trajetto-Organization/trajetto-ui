"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { updateAccountPayableSchema } from "@/schemas/create-update-account-payable-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface UpdateAccountPayableProps {
  message: string;
  /** Said without refusing, e.g. bills above their service order. */
  warnings?: string[];
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

  // The form says whether the bill already names a payee: only then is one
  // required (a legacy bill is edited without inventing it). Not sent on:
  // the schema drops keys it does not declare, and the API decides again.
  const requirePayee =
    updateAccountPayableValues.get("payee_required") === "true";

  const updateAccountPayableValidation =
    updateAccountPayableSchema(requirePayee).safeParse(accountPayableValues);

  if (updateAccountPayableValidation.error) {
    const formatError = updateAccountPayableValidation.error.flatten();

    return {
      updateAccountPayableError: formatError.fieldErrors,
    };
  }

  const accountPayableData = updateAccountPayableValidation.data;

  try {
    const response = await apiFetch(updateAccountPayable, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(accountPayableData),
    });

    const { message, warnings } =
      (await response.json()) as UpdateAccountPayableProps;

    if (!response.ok) {
      return {
        updateAccountPayableError: {
          updateAccountPayableErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-account-payable");

    return { successMessage: message, warnings: warnings ?? [] };
  } catch (error) {
    logActionError("account-payable/update-account-payable", error);
    return {
      updateAccountPayableError: {
        updateAccountPayableErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar uma conta a pagar.",
      },
    };
  }
};

export { handleUpdateAccountPayable };
