"use server";

import { getCookies } from "../../cookies";
import { createUpdateAccountPayableSchema } from "@/schemas/create-update-account-payable-schema";

interface CreateAccountPayableProps {
  message: string;
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

  const vehicleTypeValues = Object.fromEntries(
    createAccountPayableValues.entries(),
  );

  const createAccountPayableValdiation =
    createUpdateAccountPayableSchema.safeParse(vehicleTypeValues);

  if (createAccountPayableValdiation.error) {
    const formatError = createAccountPayableValdiation.error.flatten();

    return {
      createAccountPayableError: formatError.fieldErrors,
    };
  }

  const accountPayableData = createAccountPayableValdiation.data;

  try {
    const response = await fetch(createAccountPayable, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(accountPayableData),
    });

    const { message } = (await response.json()) as CreateAccountPayableProps;

    if (!response.ok && message) {
      return {
        createAccountPayableError: {
          createAccountPayableErrorMessage: message,
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createAccountPayableError: {
        createAccountPayableErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar uma conta a pagar.",
      },
    };
  }
};

export { handleCreateAccountPayable };
