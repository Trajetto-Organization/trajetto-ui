"use server";

import { createUpdateServiceOrderSchema } from "@/schemas/create-update-service-order-schema";
import { getCookies } from "../cookies";

interface ServiceOrderProps {
  message: string;
}

const handleUpdateServiceOrder = async (
  state: any,
  updateServiceOrderValues: FormData,
) => {
  if (updateServiceOrderValues.type === "RESET") {
    return {};
  }

  const businessId = updateServiceOrderValues.get("businessId");
  const serviceOrderId = updateServiceOrderValues.get("serviceOrderId");

  const updateServiceOrder = `${process.env.HTTP_REQUEST}/service-order/update-service-order/${serviceOrderId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

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
    const response = await fetch(updateServiceOrder, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serviceOrderData),
    });

    const { message } = (await response.json()) as ServiceOrderProps;

    if (!response.ok && message) {
      return {
        updateServiceOrderError: { updateServiceOrderErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateServiceOrderError: {
        updateServiceOrderErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a ordem de serviço.",
      },
    };
  }
};

export { handleUpdateServiceOrder };
