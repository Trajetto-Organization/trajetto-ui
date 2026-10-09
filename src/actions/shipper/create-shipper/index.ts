"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateShipperSchema } from "@/schemas/create-update-shipper-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface CreateShipperProps {
  message: string;
}

const handleCreateShipper = async (
  state: any,
  createShipperValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createShipperError: {
        createShipperErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createShipperValues.type === "RESET") {
    return {};
  }

  const businessId = createShipperValues.get("businessId");
  const createShipper = `${process.env.HTTP_REQUEST}/shipper/create-shipper/${businessId}`;

  const shipperValues = Object.fromEntries(createShipperValues.entries());
  const createShipperValidation =
    createUpdateShipperSchema.safeParse(shipperValues);

  if (createShipperValidation.error) {
    const formatError = createShipperValidation.error.flatten();

    return {
      createShipperError: formatError.fieldErrors,
    };
  }

  // is_active is not part of creating: a new shipper is always active.
  const { is_active: _isActive, ...shipperData } = createShipperValidation.data;

  try {
    const response = await apiFetch(createShipper, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shipperData),
    });

    const { message } = (await response.json()) as CreateShipperProps;

    if (!response.ok) {
      return {
        createShipperError: {
          createShipperErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("shipper/create-shipper", error);
    return {
      createShipperError: {
        createShipperErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o embarcador.",
      },
    };
  }
};

export { handleCreateShipper };
