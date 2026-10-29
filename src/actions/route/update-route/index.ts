"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "@/actions/cookies";
import { routeEditRequest } from "@/schemas/create-update-route-schema";
import { apiFetch } from "@/lib/api-fetch";

const FALLBACK = "Não foi possível editar a rota.";

/**
 * Editing the plan: name, day, windows, driver, vehicle — a partial update
 * of the fields the dialog changed (`changed_fields`).
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
      key !== "expected_plan_version" &&
      typeof value === "string"
    ) {
      routeValues[key] = value;
    }
  }

  // Only what changed goes to the API, checked by its own rules; the window
  // only when the edit touches it (routeEditRequest). The zone judged the
  // day rules here and is not sent: the API reads the company's itself.
  const validation = routeEditRequest(routeValues);

  if (!validation.success) {
    return { updateRouteError: validation.fieldErrors };
  }

  // The plan the dialog was opened on (D5): the API answers 409
  // ROUTE_PLAN_STALE when somebody changed it since.
  const rawExpected = updateRouteValues.get("expected_plan_version");
  const expected =
    typeof rawExpected === "string" && rawExpected.trim() !== ""
      ? Number(rawExpected)
      : NaN;

  const route = {
    ...validation.body,
    ...(Number.isInteger(expected) &&
      expected >= 0 && {
        expectedPlanVersion: expected,
      }),
  };

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/route/update-route/${routeId}/business/${businessId}`,
      {
        credentials: "include",
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(route),
      },
    );

    const { message, issues, code } = await response.json();

    if (!response.ok) {
      // A 400 VALIDATION_ERROR carries the field's own sentence in `issues`;
      // its `message` is the generic "Validation Error".
      const reason =
        (Array.isArray(issues) && typeof issues[0] === "string" && issues[0]) ||
        message ||
        FALLBACK;

      return {
        updateRouteError: {
          updateRouteErrorMessage: reason,
          ...(typeof code === "string" && { code }),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("route/update-route", error);
    return {
      updateRouteError: {
        updateRouteErrorMessage:
          "Ocorreu um erro inesperado ao tentar editar a rota.",
      },
    };
  }
};

export { handleUpdateRoute };
