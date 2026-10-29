"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "@/actions/cookies";
import { createUpdateRouteSchema } from "@/schemas/create-update-route-schema";
import { idempotencyHeaderOf } from "@/lib/idempotency-key";
import { apiFetch } from "@/lib/api-fetch";

const FALLBACK = "Não foi possível criar a rota.";

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
      logActionError("route/create-route (deliveryIds)", error);
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
      key !== "idempotency_key" &&
      typeof value === "string"
    ) {
      routeValues[key] = value;
    }
  }

  const validation = createUpdateRouteSchema.safeParse(routeValues);

  if (validation.error) {
    return { createRouteError: validation.error.flatten().fieldErrors };
  }

  // The zone only judged the day rules here; the API reads them in the
  // company's zone itself and does not take this field.
  const { plan_time_zone: _planTimeZone, ...route } = validation.data;

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/route/create-route/${businessId}`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
          // A double click or a resend after a lost answer gets the route the
          // first call made (decision 14.7, §4.7).
          ...idempotencyHeaderOf(createRouteValues.get("idempotency_key")),
        },
        body: JSON.stringify({
          ...route,
          ...(deliveryIds.length > 0 && { deliveryIds }),
        }),
      },
    );

    const { message, issues, data } = await response.json();

    if (!response.ok) {
      // A 400 VALIDATION_ERROR carries the field's own sentence in `issues`;
      // its `message` is the generic "Validation Error".
      const reason =
        (Array.isArray(issues) && typeof issues[0] === "string" && issues[0]) ||
        message ||
        FALLBACK;

      return { createRouteError: { createRouteErrorMessage: reason } };
    }

    // The new route, so the caller can offer "Abrir rota".
    return {
      successMessage: message,
      createdRoute:
        data && typeof data.id === "string"
          ? { id: data.id as string, code: Number(data.code) }
          : undefined,
    };
  } catch (error) {
    logActionError("route/create-route", error);
    return {
      createRouteError: {
        createRouteErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a rota.",
      },
    };
  }
};

export { handleCreateRoute };
