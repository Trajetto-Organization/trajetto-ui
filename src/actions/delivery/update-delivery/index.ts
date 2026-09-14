"use server";

import { createUpdateDeliverySchema } from "@/schemas/create-update-delivery-schema";
import { getCookies } from "../../cookies";

interface UpdateDeliveryProps {
  message: string;
}

/**
 * Editing a delivery never touches the cargo or the note.
 *
 * The items are what the NFe declared and the access key is the delivery's
 * identity — a wrong note is solved by cancelling and creating again, never
 * by editing in place. The API omits all three from its update schema; this
 * action simply never sends them, so the two sides agree instead of one
 * silently discarding what the other sent.
 */
const FROZEN_FIELDS = new Set([
  "items",
  "invoice_key",
  "invoice_number",
  "businessId",
  "deliveryId",
]);

const handleUpdateDelivery = async (
  state: any,
  updateDeliveryValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateDeliveryError: {
        updateDeliveryErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateDeliveryValues.type === "RESET") {
    return {};
  }

  const businessId = updateDeliveryValues.get("businessId");
  const deliveryId = updateDeliveryValues.get("deliveryId");

  const updateDelivery = `${process.env.HTTP_REQUEST}/delivery/update-delivery/${deliveryId}/business/${businessId}`;

  const deliveryValues: Record<string, string> = {};

  for (const [key, value] of updateDeliveryValues.entries()) {
    if (!FROZEN_FIELDS.has(key) && typeof value === "string") {
      deliveryValues[key] = value;
    }
  }

  const updateDeliveryValidation =
    createUpdateDeliverySchema.safeParse(deliveryValues);

  if (updateDeliveryValidation.error) {
    const formatError = updateDeliveryValidation.error.flatten();

    return {
      updateDeliveryError: formatError.fieldErrors,
    };
  }

  // The shared schema knows how to parse the key; the update must not carry
  // it even so.
  const { invoice_key: frozenKey, ...deliveryData } =
    updateDeliveryValidation.data;

  void frozenKey;

  try {
    const response = await fetch(updateDelivery, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deliveryData),
    });

    const { message } = (await response.json()) as UpdateDeliveryProps;

    if (!response.ok && message) {
      return {
        updateDeliveryError: { updateDeliveryErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateDeliveryError: {
        updateDeliveryErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a entrega.",
      },
    };
  }
};

export { handleUpdateDelivery };
