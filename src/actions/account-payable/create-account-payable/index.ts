"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { idempotencyHeaderOf } from "@/lib/idempotency-key";
import { getCookies } from "../../cookies";
import { createAccountPayableSchema } from "@/schemas/create-update-account-payable-schema";
import { apiFetch } from "@/lib/api-fetch";

interface CreateAccountPayableProps {
  message: string;
  /** Said without refusing, e.g. bills above their service order. */
  warnings?: string[];
}

const handleCreateAccountPayable = async (
  state: any,
  createAccountPayableValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createAccountPayableError: {
        createAccountPayableErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createAccountPayableValues.type === "RESET") {
    return {};
  }

  const businessId = createAccountPayableValues.get("businessId");
  const createAccountPayable = `${process.env.HTTP_REQUEST}/account-payable/create-account-payable/${businessId}`;

  const accountPayableValues = Object.fromEntries(
    createAccountPayableValues.entries(),
  );

  const createAccountPayableValdiation =
    createAccountPayableSchema.safeParse(accountPayableValues);

  if (createAccountPayableValdiation.error) {
    const formatError = createAccountPayableValdiation.error.flatten();

    return {
      createAccountPayableError: formatError.fieldErrors,
    };
  }

  const accountPayableData = createAccountPayableValdiation.data;

  try {
    const response = await apiFetch(createAccountPayable, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
        // The same form saved twice is one bill (IDEMP-14).
        ...idempotencyHeaderOf(
          createAccountPayableValues.get("idempotency_key"),
        ),
      },
      body: JSON.stringify(accountPayableData),
    });

    const { message, warnings } =
      (await response.json()) as CreateAccountPayableProps;

    if (!response.ok) {
      return {
        createAccountPayableError: {
          createAccountPayableErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message, warnings: warnings ?? [] };
  } catch (error) {
    logActionError("account-payable/create-account-payable", error);
    return {
      createAccountPayableError: {
        createAccountPayableErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar uma conta a pagar.",
      },
    };
  }
};

export { handleCreateAccountPayable };
