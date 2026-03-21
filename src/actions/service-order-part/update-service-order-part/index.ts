"use server";

import { createUpdateServiceOrderPartSchema } from "@/schemas/create-update-service-order-part-schema";
import { getCookies } from "../../cookies";

interface ServiceOrderPartProps {
  message: string;
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
    const response = await fetch(updateServiceOrderPart, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serviceOrderPartData),
    });

    const { message } = (await response.json()) as ServiceOrderPartProps;

    if (!response.ok && message) {
      return {
        updateServiceOrderPartError: {
          updateServiceOrderPartErrorMessage: message,
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateServiceOrderPartError: {
        updateServiceOrderPartErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a ordem de serviço por peça.",
      },
    };
  }
};

export { handleUpdateServiceOrderPart };
