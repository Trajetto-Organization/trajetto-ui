"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateServiceOrderPartSchema } from "@/schemas/create-update-service-order-part-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface ServiceOrderPartProps {
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
function partsWarningOf(answer: ServiceOrderPartProps): string | undefined {
  if (!answer.partsExceedTotal || !answer.totals) return undefined;

  return `As peças desta ordem somam ${brl.format(answer.totals.partsTotal)}, mais que o valor total dela (${brl.format(answer.totals.totalAmount)}). Revise o valor total da ordem de serviço.`;
}

const handleUpdateServiceOrderPart = async (
  state: any,
  updateServiceOrderPartValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateServiceOrderPartError: {
        updateServiceOrderPartErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateServiceOrderPartValues.type === "RESET") {
    return {};
  }

  const businessId = updateServiceOrderPartValues.get("businessId");
  const serviceOrderId = updateServiceOrderPartValues.get("serviceOrderId");

  const serviceOrderPartId =
    updateServiceOrderPartValues.get("serviceOrderPartId");
  const updateServiceOrderPart = `${process.env.HTTP_REQUEST}/service-order-part/update-service-order-part/${serviceOrderPartId}/serviceOrder/${serviceOrderId}/business/${businessId}`;

  const serviceOrderPartValues = Object.fromEntries(
    updateServiceOrderPartValues.entries(),
  );
  const updateServiceOrderPartValidation =
    createUpdateServiceOrderPartSchema.safeParse(serviceOrderPartValues);

  if (updateServiceOrderPartValidation.error) {
    const formatError = updateServiceOrderPartValidation.error.flatten();

    return {
      updateServiceOrderPartError: formatError.fieldErrors,
    };
  }

  const serviceOrderPartData = updateServiceOrderPartValidation.data;

  try {
    const response = await apiFetch(updateServiceOrderPart, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serviceOrderPartData),
    });

    const answer = (await response.json()) as ServiceOrderPartProps;
    const { message } = answer;

    if (!response.ok) {
      return {
        updateServiceOrderPartError: {
          updateServiceOrderPartErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-service-order-part");

    return { successMessage: message, warningMessage: partsWarningOf(answer) };
  } catch (error) {
    logActionError("service-order-part/update-service-order-part", error);
    return {
      updateServiceOrderPartError: {
        updateServiceOrderPartErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a ordem de serviço por peça.",
      },
    };
  }
};

export { handleUpdateServiceOrderPart };
