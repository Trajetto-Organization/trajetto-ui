"use server";

import { getCookies } from "@/actions/cookies";
import { createUpdateRouteSchema } from "@/schemas/create-update-route-schema";

/**
 * Editing the plan: name, day, windows, driver, vehicle.
 *
 * Never the status — release, start and cancel are their own endpoints,
 * because each carries rules an open-ended PATCH could not. The stops are not
 * here either: they have their own screen, and adding one to a route is a
 * different act from renaming it.
 */
const handleUpdateRoute = async (state: any, updateRouteValues: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateRouteError: {
        updateRouteErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  const businessId = updateRouteValues.get("businessId");
  const routeId = updateRouteValues.get("routeId");

  const routeValues: Record<string, string> = {};

  for (const [key, value] of updateRouteValues.entries()) {
    if (
      key !== "businessId" &&
      key !== "routeId" &&
      typeof value === "string"
    ) {
      routeValues[key] = value;
    }
  }

  const validation = createUpdateRouteSchema.safeParse(routeValues);

  if (validation.error) {
    return { updateRouteError: validation.error.flatten().fieldErrors };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/route/update-route/${routeId}/business/${businessId}`,
      {
        credentials: "include",
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.data),
      },
    );

    const { message } = await response.json();

    if (!response.ok && message) {
      return { updateRouteError: { updateRouteErrorMessage: message } };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateRouteError: {
        updateRouteErrorMessage:
          "Ocorreu um erro inesperado ao tentar editar a rota.",
      },
    };
  }
};

export { handleUpdateRoute };
