"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { updateFuelFormSchema } from "@/schemas/create-update-fuel-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface UpdateFuelProps {
  message: string;
}

const handleUpdateFuel = async (state: any, updateFuelValues: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateFuelError: {
        updateFuelErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateFuelValues.type === "RESET") {
    return {};
  }

  const businessId = updateFuelValues.get("businessId");
  const fuelId = updateFuelValues.get("fuelId");

  // A replacement photo, when there is one, is already in storage: the browser
  // uploaded it directly and only its key arrives here. Type and size were
  // enforced in the browser and again by storage, which refuses a PUT that does
  // not match the signature. An edit that leaves the photo alone omits it, and
  // the record keeps the one it already has.
  const photoKey = updateFuelValues.get("photoKey");
  const updateFuel = `${process.env.HTTP_REQUEST}/fuel/update-fuel/${fuelId}/business/${businessId}`;

  // Extract form values excluding the photo key
  const formValues: Record<string, string> = {};
  for (const [key, value] of updateFuelValues.entries()) {
    if (key !== "photoKey" && typeof value === "string") {
      formValues[key] = value;
    }
  }

  const updateFuelValidation = updateFuelFormSchema.safeParse(formValues);

  if (updateFuelValidation.error) {
    const formatError = updateFuelValidation.error.flatten();

    return {
      updateFuelError: formatError.fieldErrors,
    };
  }

  try {
    const body: Record<string, unknown> = {};

    // Add all form fields
    // What the form sent: the typed values always, a link or the location
    // only when changed (the edit dialog decides; absent keys stay as they
    // are on the server).
    Object.entries(updateFuelValidation.data).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert null to empty string for optional fields like notes
        body[key] = value === null ? "" : value;
      }
    });

    // Only sent when the photo was actually replaced.
    if (typeof photoKey === "string" && photoKey.length > 0) {
      body.photo = { key: photoKey };
    }

    const response = await apiFetch(updateFuel, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const { message } = (await response.json()) as UpdateFuelProps;

    if (!response.ok) {
      return {
        updateFuelError: {
          updateFuelErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("fuel/update-fuel", error);
    return {
      updateFuelError: {
        updateFuelErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o abastecimento.",
      },
    };
  }
};

export { handleUpdateFuel };
