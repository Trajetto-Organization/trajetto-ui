"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { idempotencyHeaderOf } from "@/lib/idempotency-key";
import { createUpdateServiceOrderSchema } from "@/schemas/create-update-service-order-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface CreateServiceOrderProps {
  message: string;
}

const handleCreateServiceOrder = async (
  state: any,
  createServiceOrderValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createServiceOrderError: {
        createServiceOrderErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createServiceOrderValues.type === "RESET") {
    return {};
  }

  const businessId = createServiceOrderValues.get("businessId");
  const createServiceOrder = `${process.env.HTTP_REQUEST}/service-order/create-service-order/${businessId}`;

  const serviceOrderValues = Object.fromEntries(
    createServiceOrderValues.entries(),
  );

  const createServiceOrderValidation =
    createUpdateServiceOrderSchema.safeParse(serviceOrderValues);

  if (createServiceOrderValidation.error) {
    const formatError = createServiceOrderValidation.error.flatten();

    return {
      createServiceOrderError: formatError.fieldErrors,
    };
  }

  const serviceOrderData = createServiceOrderValidation.data;

  // 🆕 Add record origin (WEB_DASHBOARD)
  const serviceOrderDataWithOrigin = {
    ...serviceOrderData,
    created_from: "WEB_DASHBOARD",
  };

  try {
    const response = await apiFetch(createServiceOrder, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
        // The same form saved twice is one order (IDEMP-14).
        ...idempotencyHeaderOf(createServiceOrderValues.get("idempotency_key")),
      },
      body: JSON.stringify(serviceOrderDataWithOrigin),
    });

    const { message } = (await response.json()) as CreateServiceOrderProps;

    if (!response.ok) {
      return {
        createServiceOrderError: {
          createServiceOrderErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-service-order");

    return { successMessage: message };
  } catch (error) {
    logActionError("service-order/create-service-order", error);
    return {
      createServiceOrderError: {
        createServiceOrderErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a ordem de serviço.",
      },
    };
  }
};

export { handleCreateServiceOrder };
