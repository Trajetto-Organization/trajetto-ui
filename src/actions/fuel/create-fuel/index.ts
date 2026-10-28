"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateFuelSchema } from "@/schemas/create-update-fuel-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface CreateFuelProps {
  message: string;
}

const handleCreateFuel = async (state: any, createFuelValues: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createFuelError: {
        createFuelErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createFuelValues.type === "RESET") {
    return {};
  }

  const businessId = createFuelValues.get("businessId");

  // The photo is already in storage: the browser uploaded it directly before
  // this action ran, and what arrives here is its key. See the checklist create
  // action for why the file itself no longer travels through a Server Action.
  const photoKey = createFuelValues.get("photoKey");

  // Extract form values excluding the photo key FIRST
  const formValues: Record<string, string> = {};

  for (const [key, value] of createFuelValues.entries()) {
    if (key !== "photoKey" && typeof value === "string") {
      formValues[key] = value;
    }
  }

  // Validate form fields FIRST using Zod
  const createFuelValidation = createUpdateFuelSchema.safeParse(formValues);

  // Collect all validation errors (both form and file)
  const allErrors: Record<string, string[]> = {};

  // Add form field errors if any
  if (createFuelValidation.error) {
    const formatError = createFuelValidation.error.flatten();
    Object.assign(allErrors, formatError.fieldErrors);
  }

  // Type and size were enforced in the browser and are enforced again by
  // storage, which refuses a PUT that does not match the signature. What is
  // still worth checking here is presence.
  if (typeof photoKey !== "string" || photoKey.length === 0) {
    allErrors.odometer_photo = ["A foto do odômetro é obrigatória."];
  }

  // Return ALL errors if any exist
  if (Object.keys(allErrors).length > 0) {
    return {
      createFuelError: allErrors,
    };
  }

  const createFuel = `${process.env.HTTP_REQUEST}/fuel/create-fuel/${businessId}`;

  try {
    const body: Record<string, unknown> = {
      // 🆕 Record origin (WEB_DASHBOARD)
      created_from: "WEB_DASHBOARD",
      photo: { key: photoKey },
    };

    // Add all form fields (we know validation.data exists because we validated above)
    if (createFuelValidation.success) {
      Object.entries(createFuelValidation.data).forEach(([key, value]) => {
        // Only send non-null values to avoid sending "null" strings
        if (value !== null && value !== undefined) {
          body[key] = value;
        }
      });
    }

    const response = await apiFetch(createFuel, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const { message } = (await response.json()) as CreateFuelProps;

    if (!response.ok) {
      return {
        createFuelError: {
          createFuelErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("create-fuel");

    return { successMessage: message };
  } catch (error) {
    logActionError("fuel/create-fuel", error);
    return {
      createFuelError: {
        createFuelErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o abastecimento.",
      },
    };
  }
};

export { handleCreateFuel };
