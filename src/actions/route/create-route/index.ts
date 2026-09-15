"use server";

import { getCookies } from "@/actions/cookies";
import { createUpdateRouteSchema } from "@/schemas/create-update-route-schema";

/**
 * Planning a day for one driver.
 *
 * The selected deliveries travel as a single JSON string field, the way the
 * delivery form sends its items: a form submits flat key/value pairs, and a
 * multi-select has no flat shape that survives `FormData` without one field
 * per row.
 */
const handleCreateRoute = async (state: any, createRouteValues: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createRouteError: {
        createRouteErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  const businessId = createRouteValues.get("businessId");

  let deliveryIds: string[] = [];

  const rawDeliveries = createRouteValues.get("deliveryIds");

  if (typeof rawDeliveries === "string" && rawDeliveries.length > 0) {
    try {
      const parsed = JSON.parse(rawDeliveries);

      if (Array.isArray(parsed)) deliveryIds = parsed as string[];
    } catch (error) {
      return {
        createRouteError: {
          createRouteErrorMessage:
            "Não foi possível ler as entregas selecionadas. Atualize a tela e tente novamente.",
        },
      };
    }
  }

  const routeValues: Record<string, string> = {};

  for (const [key, value] of createRouteValues.entries()) {
    if (
      key !== "businessId" &&
      key !== "deliveryIds" &&
      typeof value === "string"
    ) {
      routeValues[key] = value;
    }
  }

  const validation = createUpdateRouteSchema.safeParse(routeValues);

  if (validation.error) {
    return { createRouteError: validation.error.flatten().fieldErrors };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/route/create-route/${businessId}`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...validation.data,
          ...(deliveryIds.length > 0 && { deliveryIds }),
        }),
      },
    );

    const { message } = await response.json();

    if (!response.ok && message) {
      return { createRouteError: { createRouteErrorMessage: message } };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createRouteError: {
        createRouteErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a rota.",
      },
    };
  }
};

export { handleCreateRoute };
