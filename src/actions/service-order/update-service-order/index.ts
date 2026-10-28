"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateServiceOrderSchema } from "@/schemas/create-update-service-order-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface ServiceOrderProps {
  message: string;
}

const handleUpdateServiceOrder = async (
  state: any,
  updateServiceOrderValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateServiceOrderError: {
        updateServiceOrderErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateServiceOrderValues.type === "RESET") {
    return {};
  }

  const businessId = updateServiceOrderValues.get("businessId");
  const serviceOrderId = updateServiceOrderValues.get("serviceOrderId");

  const updateServiceOrder = `${process.env.HTTP_REQUEST}/service-order/update-service-order/${serviceOrderId}/business/${businessId}`;
  const serviceOrderValues = Object.fromEntries(
    updateServiceOrderValues.entries(),
  );

  const updateServiceOrderValidation =
    createUpdateServiceOrderSchema.safeParse(serviceOrderValues);

  if (updateServiceOrderValidation.error) {
    const formatError = updateServiceOrderValidation.error.flatten();

    return {
      updateServiceOrderError: formatError.fieldErrors,
    };
  }

  const serviceOrderData = updateServiceOrderValidation.data;

  try {
    const response = await apiFetch(updateServiceOrder, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serviceOrderData),
    });

    const { message } = (await response.json()) as ServiceOrderProps;

    if (!response.ok) {
      return {
        updateServiceOrderError: {
          updateServiceOrderErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-service-order");

    return { successMessage: message };
  } catch (error) {
    logActionError("service-order/update-service-order", error);
    return {
      updateServiceOrderError: {
        updateServiceOrderErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a ordem de serviço.",
      },
    };
  }
};

export { handleUpdateServiceOrder };
