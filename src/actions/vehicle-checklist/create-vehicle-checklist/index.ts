"use server";

import { createUpdateVehicleChecklistSchema } from "@/schemas/create-update-vehicle-checklist-schema";
import { getCookies } from "../../cookies";

interface CreateVehicleChecklistProps {
  message: string;
}

interface UploadedPhoto {
  key: string;
  fieldName?: string;
}

const REQUIRED_PHOTO_FIELDS = [
  "current_mileage",
  "fuel_level_adequate",
  "tires_condition",
] as const;

const REQUIRED_PHOTO_LABELS: Record<string, string> = {
  current_mileage: "quilometragem",
  fuel_level_adequate: "nível de combustível",
  tires_condition: "condição dos pneus",
};

/**
 * The photos arrive as keys, not as files.
 *
 * The browser uploads straight to storage before this action is called, so
 * what crosses the wire here is a short JSON string. That is deliberate: a
 * Server Action buffers its whole body in the Next.js server's memory and
 * rejects anything past 1 MB, which a handful of camera photos passed without
 * trouble — and the failure showed up as a spinner that never stopped, with
 * nothing in the network tab and nothing in the API logs.
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

const handleCreateVehicleChecklist = async (
  state: any,
  createChecklistValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createVehicleChecklistError: {
        createVehicleChecklistErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createChecklistValues.type === "RESET") {
    return {};
  }

  const businessId = createChecklistValues.get("businessId");
  const photos = parseUploadedPhotos(createChecklistValues.get("photos"));

  const formValues: Record<string, any> = {};

  for (const [key, value] of createChecklistValues.entries()) {
    // `photos` carries the uploaded keys and is handled separately; everything
    // else is a plain checklist field.
    if (key === "photos" || typeof value !== "string") continue;

    if (value === "true") {
      formValues[key] = true;
    } else if (value === "false") {
      formValues[key] = false;
    } else {
      formValues[key] = value;
    }
  }

  // Validate form fields using Zod
  const createChecklistValidation =
    createUpdateVehicleChecklistSchema.safeParse(formValues);

  // Collect all validation errors
  const allErrors: Record<string, string[]> = {};

  // Add form field errors if any
  if (createChecklistValidation.error) {
    const formatError = createChecklistValidation.error.flatten();
    Object.assign(allErrors, formatError.fieldErrors);
  }

  // File type and size were already enforced in the browser and are enforced
  // again by storage itself, which refuses a PUT that does not match the
  // signature. What is still worth checking here is presence.
  const fieldsWithPhotos = new Set(
    photos.map(({ fieldName }) => fieldName).filter(Boolean),
  );

  for (const field of REQUIRED_PHOTO_FIELDS) {
    if (!fieldsWithPhotos.has(field)) {
      allErrors[field] = [
        `A foto de ${REQUIRED_PHOTO_LABELS[field]} é obrigatória.`,
      ];
    }
  }

  // Return ALL errors if any exist
  if (Object.keys(allErrors).length > 0) {
    return {
      createVehicleChecklistError: allErrors,
    };
  }

  const createVehicleChecklist = `${process.env.HTTP_REQUEST}/vehicle-checklist/create-vehicle-checklist/${businessId}`;

  try {
    const response = await fetch(createVehicleChecklist, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(createChecklistValidation.success
          ? createChecklistValidation.data
          : {}),
        photos,
      }),
    });

    const { message } = (await response.json()) as CreateVehicleChecklistProps;

    if (!response.ok && message) {
      return {
        createVehicleChecklistError: {
          createVehicleChecklistErrorMessage: message,
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createVehicleChecklistError: {
        createVehicleChecklistErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o checklist veicular.",
      },
    };
  }
};

export { handleCreateVehicleChecklist };
