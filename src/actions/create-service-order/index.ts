"use server";

import { createUpdateServiceOrderSchema } from "@/schemas/create-update-service-order-schema";
import { getCookies } from "../cookies";

interface CreateServiceOrderProps {
  message: string;
}

const handleCreateServiceOrder = async (
  state: any,
  createServiceOrderValues: FormData,
) => {
  if (createServiceOrderValues.type === "RESET") {
    return {};
  }

  const businessId = createServiceOrderValues.get("businessId");

  const createServiceOrder = `${process.env.HTTP_REQUEST}/service-order/create-service-order/${businessId}`;
  const tokenAccess = await getCookies("tkey");

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

  try {
    const response = await fetch(createServiceOrder, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serviceOrderData),
    });

    const { message } = (await response.json()) as CreateServiceOrderProps;

    if (!response.ok && message) {
      return {
        createServiceOrderError: { createServiceOrderErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createServiceOrderError: {
        createServiceOrderErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a ordem de serviço.",
      },
    };
  }
};

export { handleCreateServiceOrder };
