"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { idempotencyHeaderOf } from "@/lib/idempotency-key";
import {
  createUpdateDeliverySchema,
  deliveryItemsSchema,
} from "@/schemas/create-update-delivery-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface CreateDeliveryProps {
  message: string;
}

interface DeliveryItemInput {
  description: string;
  quantity?: number;
  unit?: string;
  unit_value?: number;
}

const handleCreateDelivery = async (
  state: any,
  createDeliveryValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createDeliveryError: {
        createDeliveryErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createDeliveryValues.type === "RESET") {
    return {};
  }

  const businessId = createDeliveryValues.get("businessId");
  const createDelivery = `${process.env.HTTP_REQUEST}/delivery/create-delivery/${businessId}`;

  // Cargo items are edited as a repeatable block, so they travel as JSON
  // instead of loose form fields.
  const rawItems = createDeliveryValues.get("items");

  let items: DeliveryItemInput[] = [];

  if (typeof rawItems === "string" && rawItems.length > 0) {
    let parsedItems: unknown;

    try {
      parsedItems = JSON.parse(rawItems);
    } catch (error) {
      logActionError("delivery/create-delivery (items)", error);
      return {
        createDeliveryError: {
          items: ["Não foi possível ler os itens da carga."],
        },
      };
    }

    const itemsValidation = deliveryItemsSchema.safeParse(parsedItems);

    if (!itemsValidation.success) {
      // Each issue is prefixed with its row, because the items block has no
      // per-field label to hang an error on.
      const itemErrors = itemsValidation.error.issues.map((issue) => {
        const [index] = issue.path;

        return typeof index === "number"
          ? `Item ${index + 1}: ${issue.message}`
          : issue.message;
      });

      return {
        createDeliveryError: { items: itemErrors },
      };
    }

    items = itemsValidation.data as DeliveryItemInput[];
  }

  const deliveryValues: Record<string, string> = {};

  for (const [key, value] of createDeliveryValues.entries()) {
    if (key !== "items" && key !== "businessId" && typeof value === "string") {
      deliveryValues[key] = value;
    }
  }

  const createDeliveryValidation =
    createUpdateDeliverySchema.safeParse(deliveryValues);

  if (createDeliveryValidation.error) {
    const formatError = createDeliveryValidation.error.flatten();

    return {
      createDeliveryError: formatError.fieldErrors,
    };
  }

  try {
    const response = await apiFetch(createDelivery, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
        // The same form saved twice is one delivery (IDEMP-14).
        ...idempotencyHeaderOf(createDeliveryValues.get("idempotency_key")),
      },
      body: JSON.stringify({
        ...createDeliveryValidation.data,
        ...(items.length > 0 && { items }),
      }),
    });

    const { message } = (await response.json()) as CreateDeliveryProps;

    if (!response.ok) {
      return {
        createDeliveryError: {
          createDeliveryErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-delivery");

    return { successMessage: message };
  } catch (error) {
    logActionError("delivery/create-delivery", error);
    return {
      createDeliveryError: {
        createDeliveryErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a entrega.",
      },
    };
  }
};

export { handleCreateDelivery };
export type { DeliveryItemInput };
