"use server";

import { logActionError } from "@/lib/log-action-error";
import { idempotencyHeaderOf } from "@/lib/idempotency-key";
import { readBusinessIdParam } from "@/lib/business-id-param";

import { fineFormSchema } from "@/features/fine/lib/fine-form-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface CreateFineProps {
  message: string;
}

const handleCreateFine = async (state: any, createFineValues: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createFineError: {
        createFineErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createFineValues.type === "RESET") {
    return {};
  }

  // A company id, or nothing: it becomes a segment of the API path.
  const businessId = readBusinessIdParam(
    createFineValues.get("businessId") as string | null,
  );

  if (!businessId) {
    return {
      createFineError: {
        createFineErrorMessage: "Selecione uma empresa para registrar a multa.",
      },
    };
  }

  const createFine = `${process.env.HTTP_REQUEST}/fines/create-fine/${businessId}`;

  const fineValues = Object.fromEntries(createFineValues.entries());
  const createFineValidation = fineFormSchema.safeParse(fineValues);

  if (createFineValidation.error) {
    const formatError = createFineValidation.error.flatten();
    return {
      createFineError: formatError.fieldErrors,
    };
  }

  try {
    const response = await apiFetch(createFine, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
        // The same form saved twice is one fine (IDEMP-14).
        ...idempotencyHeaderOf(createFineValues.get("idempotency_key")),
      },
      body: JSON.stringify({
        ...createFineValidation.data,
        created_from: "WEB_DASHBOARD",
      }),
    });

    const { message } = (await response.json()) as CreateFineProps;

    if (!response.ok) {
      return {
        createFineError: {
          createFineErrorMessage:
            message || "Não foi possível registrar a multa.",
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("fine/create-fine", error);
    return {
      createFineError: {
        createFineErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a multa.",
      },
    };
  }
};

export { handleCreateFine };
