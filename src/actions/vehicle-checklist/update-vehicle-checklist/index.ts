"use server";

import { createUpdateVehicleChecklistSchema } from "@/schemas/create-update-vehicle-checklist-schema";
import { getCookies } from "../../cookies";

interface UpdateVehicleChecklistProps {
  message: string;
}

interface UploadedPhoto {
  key: string;
  fieldName?: string;
}

/**
 * Photos arrive as keys, uploaded by the browser straight to storage before
 * this action runs. See the create action for why the files no longer travel
 * through here.
 */
const parseUploadedPhotos = (
  raw: FormDataEntryValue | null,
): UploadedPhoto[] => {
  if (typeof raw !== "string" || raw.length === 0) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UploadedPhoto[]) : [];
  } catch {
    return [];
  }
};

const handleUpdateVehicleChecklist = async (
  state: any,
  updateChecklistValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateVehicleChecklistError: {
        updateVehicleChecklistErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateChecklistValues.type === "RESET") {
    return {};
  }

  const businessId = updateChecklistValues.get("businessId");
  const checklistId = updateChecklistValues.get("checklistId");

  const photosToRemoveStr = updateChecklistValues.get(
    "photosToRemove",
  ) as string;

  const photos = parseUploadedPhotos(updateChecklistValues.get("photos"));

  const formValues: Record<string, any> = {};

  const photosToRemove: string[] = photosToRemoveStr
    ? JSON.parse(photosToRemoveStr)
    : [];

  for (const [key, value] of updateChecklistValues.entries()) {
    // Metadata and the uploaded keys are handled separately; everything else
    // is a plain checklist field.
    if (
      typeof value !== "string" ||
      key === "photos" ||
      key === "photosToRemove" ||
      key === "businessId" ||
      key === "checklistId"
    ) {
      continue;
    }

    // Convert string booleans to actual booleans
    if (value === "true") {
      formValues[key] = true;
    } else if (value === "false") {
      formValues[key] = false;
    } else {
      // Include all strings, including empty ones for fields like notes that need to be cleared
      formValues[key] = value.trim() === "" ? "" : value;
    }
  }

  // Validate form fields using Zod
  const updateChecklistValidation =
    createUpdateVehicleChecklistSchema.safeParse(formValues);

  // Collect all validation errors
  const allErrors: Record<string, string[]> = {};

  // Add form field errors if any
  if (updateChecklistValidation.error) {
    const formatError = updateChecklistValidation.error.flatten();
    Object.assign(allErrors, formatError.fieldErrors);
  }

  // Return ALL errors if any exist
  if (Object.keys(allErrors).length > 0) {
    return {
      updateVehicleChecklistError: allErrors,
    };
  }

  const updateVehicleChecklist = `${process.env.HTTP_REQUEST}/vehicle-checklist/update-vehicle-checklist/${checklistId}/business/${businessId}`;

  try {
    const body: Record<string, unknown> = { photos };

    // Every validated field is sent, including the empty ones — that is how a
    // value gets cleared.
    if (updateChecklistValidation.success) {
      Object.entries(updateChecklistValidation.data).forEach(([key, value]) => {
        if (value === undefined) return;

        // `notes` keeps arriving as an empty string so the API converts it to
        // null instead of leaving the previous text in place.
        body[key] = value === null ? "" : value;
      });
    }

    if (photosToRemove.length > 0) {
      body.photosToRemove = photosToRemove;
    }

    const response = await fetch(updateVehicleChecklist, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const { message } = (await response.json()) as UpdateVehicleChecklistProps;

    if (!response.ok && message) {
      return {
        updateVehicleChecklistError: {
          updateVehicleChecklistErrorMessage: message,
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateVehicleChecklistError: {
        updateVehicleChecklistErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o checklist veicular.",
      },
    };
  }
};

export { handleUpdateVehicleChecklist };
