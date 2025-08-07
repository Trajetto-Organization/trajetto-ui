"use server";

import { createUpdateServiceOrderPartSchema } from "@/schemas/create-update-service-order-part-schema";
import { getCookies } from "../cookies";

interface CreateServiceOrderPartProps {
  message: string;
}

const handleCreateServiceOrderPart = async (
  state: any,
  createServiceOrderPartValues: FormData,
) => {
  if (createServiceOrderPartValues.type === "RESET") {
    return {};
  }

  const businessId = createServiceOrderPartValues.get("businessId");
  const serviceOrderId = createServiceOrderPartValues.get("serviceOrderId");

  const createServiceOrderPart = `${process.env.HTTP_REQUEST}/service-order-part/create-service-order-part/${serviceOrderId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

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
    const response = await fetch(createServiceOrderPart, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serviceOrderPartData),
    });

    const { message } = (await response.json()) as CreateServiceOrderPartProps;

    if (!response.ok && message) {
      return {
        createServiceOrderPartError: {
          createServiceOrderPartErrorMessage: message,
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createServiceOrderPartError: {
        createServiceOrderPartErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a ordem de serviço da peça.",
      },
    };
  }
};

export { handleCreateServiceOrderPart };
