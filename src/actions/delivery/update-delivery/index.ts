"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import {
  createUpdateDeliverySchema,
  deliveryItemsSchema,
} from "@/schemas/create-update-delivery-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface UpdateDeliveryProps {
  message: string;
}

/**
 * Editing a delivery (decision 5.2).
 *
 * The NF-e key is set once: the form sends it only while the delivery has
 * none, and the API refuses changing a key already set. The items travel only
 * when the form offers them — a typed delivery's, never an NF-e XML's, which
 * are what the note declared. The API is the authority on both.
 */
const ROUTING_FIELDS = new Set(["items", "businessId", "deliveryId"]);

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
    if (!ROUTING_FIELDS.has(key) && typeof value === "string") {
      deliveryValues[key] = value;
    }
  }

  // The items, as the create sends them: a repeatable block serialised as
  // JSON by the form, present only when the form offered it.
  const rawItems = updateDeliveryValues.get("items");

  let items: unknown[] | undefined;

  if (typeof rawItems === "string") {
    let parsedItems: unknown;

    try {
      parsedItems = JSON.parse(rawItems || "[]");
    } catch (error) {
      logActionError("delivery/update-delivery (items)", error);

      return {
        updateDeliveryError: {
          items: ["Não foi possível ler os itens da carga."],
        },
      };
    }

    const itemsValidation = deliveryItemsSchema.safeParse(parsedItems);

    if (!itemsValidation.success) {
      return {
        updateDeliveryError: {
          items: itemsValidation.error.issues.map((issue) => {
            const [index] = issue.path;

            return typeof index === "number"
              ? `Item ${index + 1}: ${issue.message}`
              : issue.message;
          }),
        },
      };
    }

    items = itemsValidation.data;
  }

  const updateDeliveryValidation =
    createUpdateDeliverySchema.safeParse(deliveryValues);

  if (updateDeliveryValidation.error) {
    const formatError = updateDeliveryValidation.error.flatten();

    return {
      updateDeliveryError: formatError.fieldErrors,
    };
  }

  // The key only when the form sent the field (it does while the delivery
  // has none); otherwise it stays out of the patch.
  const { invoice_key: invoiceKey, ...fields } = updateDeliveryValidation.data;

  const deliveryData = {
    ...fields,
    ...(deliveryValues.invoice_key !== undefined && {
      invoice_key: invoiceKey,
    }),
    ...(items !== undefined && { items }),
  };

  try {
    const response = await apiFetch(updateDelivery, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deliveryData),
    });

    const { message } = (await response.json()) as UpdateDeliveryProps;

    if (!response.ok) {
      return {
        updateDeliveryError: {
          updateDeliveryErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("delivery/update-delivery", error);
    return {
      updateDeliveryError: {
        updateDeliveryErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a entrega.",
      },
    };
  }
};

export { handleUpdateDelivery };
