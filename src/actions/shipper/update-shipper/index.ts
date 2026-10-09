"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateShipperSchema } from "@/schemas/create-update-shipper-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface UpdateShipperProps {
  message: string;
}

const handleUpdateShipper = async (
  state: any,
  updateShipperValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateShipperError: {
        updateShipperErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateShipperValues.type === "RESET") {
    return {};
  }

  const businessId = updateShipperValues.get("businessId");
  const shipperId = updateShipperValues.get("shipperId");

  const updateShipper = `${process.env.HTTP_REQUEST}/shipper/update-shipper/${shipperId}/business/${businessId}`;

  const shipperValues = Object.fromEntries(updateShipperValues.entries());
  const updateShipperValidation =
    createUpdateShipperSchema.safeParse(shipperValues);

  if (updateShipperValidation.error) {
    const formatError = updateShipperValidation.error.flatten();

    return {
      updateShipperError: formatError.fieldErrors,
    };
  }

  try {
    const response = await apiFetch(updateShipper, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateShipperValidation.data),
    });

    const { message } = (await response.json()) as UpdateShipperProps;

    if (!response.ok) {
      return {
        updateShipperError: {
          updateShipperErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("shipper/update-shipper", error);
    return {
      updateShipperError: {
        updateShipperErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o embarcador.",
      },
    };
  }
};

export { handleUpdateShipper };
