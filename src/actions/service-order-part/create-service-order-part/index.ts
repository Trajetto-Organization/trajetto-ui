"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateServiceOrderPartSchema } from "@/schemas/create-update-service-order-part-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface CreateServiceOrderPartProps {
  message: string;
  /** The order's typed total and its parts' sum after this change (FLEET-SO-2). */
  totals?: { totalAmount: number; partsTotal: number };
  partsExceedTotal?: boolean;
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** A warning, never a refusal: the order's total is typed and stays so. */
function partsWarningOf(
  answer: CreateServiceOrderPartProps,
): string | undefined {
  if (!answer.partsExceedTotal || !answer.totals) return undefined;

  return `As peças desta ordem somam ${brl.format(answer.totals.partsTotal)}, mais que o valor total dela (${brl.format(answer.totals.totalAmount)}). Revise o valor total da ordem de serviço.`;
}

const handleCreateServiceOrderPart = async (
  state: any,
  createServiceOrderPartValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createServiceOrderPartError: {
        createServiceOrderPartErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createServiceOrderPartValues.type === "RESET") {
    return {};
  }

  const businessId = createServiceOrderPartValues.get("businessId");
  const serviceOrderId = createServiceOrderPartValues.get("serviceOrderId");

  const createServiceOrderPart = `${process.env.HTTP_REQUEST}/service-order-part/create-service-order-part/${serviceOrderId}/business/${businessId}`;
  const serviceOrderPartValues = Object.fromEntries(
    createServiceOrderPartValues.entries(),
  );

  const createServiceOrderPartValidation =
    createUpdateServiceOrderPartSchema.safeParse(serviceOrderPartValues);

  if (createServiceOrderPartValidation.error) {
    const formatError = createServiceOrderPartValidation.error.flatten();
    return {
      createServiceOrderPartError: formatError.fieldErrors,
    };
  }

  const serviceOrderPartData = createServiceOrderPartValidation.data;

  try {
    const response = await apiFetch(createServiceOrderPart, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serviceOrderPartData),
    });

    const answer = (await response.json()) as CreateServiceOrderPartProps;
    const { message } = answer;

    if (!response.ok) {
      return {
        createServiceOrderPartError: {
          createServiceOrderPartErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message, warningMessage: partsWarningOf(answer) };
  } catch (error) {
    logActionError("service-order-part/create-service-order-part", error);
    return {
      createServiceOrderPartError: {
        createServiceOrderPartErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a ordem de serviço da peça.",
      },
    };
  }
};

export { handleCreateServiceOrderPart };
