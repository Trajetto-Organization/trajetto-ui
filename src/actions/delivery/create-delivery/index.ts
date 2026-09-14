"use server";

import {
  createUpdateDeliverySchema,
  deliveryItemsSchema,
} from "@/schemas/create-update-delivery-schema";
import { getCookies } from "../../cookies";

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
    const response = await fetch(createDelivery, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...createDeliveryValidation.data,
        ...(items.length > 0 && { items }),
      }),
    });

    const { message } = (await response.json()) as CreateDeliveryProps;

    if (!response.ok && message) {
      return {
        createDeliveryError: { createDeliveryErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
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
