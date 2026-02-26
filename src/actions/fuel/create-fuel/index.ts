"use server";

import { createUpdateFuelSchema } from "@/schemas/create-update-fuel-schema";
import { getCookies } from "../../cookies";

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
  const odometerPhoto = createFuelValues.get("odometer_photo") as File;

  // Extract form values excluding the file FIRST
  const formValues: Record<string, string> = {};

  for (const [key, value] of createFuelValues.entries()) {
    if (key !== "odometer_photo" && typeof value === "string") {
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

  // Validate file and add file errors
  if (!odometerPhoto || odometerPhoto.size === 0) {
    allErrors.odometer_photo = ["A foto do odômetro é obrigatória."];
  } else {
    // Validate file type and size only if file exists
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(odometerPhoto.type)) {
      allErrors.odometer_photo = [
        "Tipo de arquivo não suportado. Use apenas JPEG, JPG, PNG ou WebP.",
      ];
    } else if (odometerPhoto.size > maxSize) {
      allErrors.odometer_photo = ["O arquivo deve ter no máximo 5MB."];
    }
  }

  // Return ALL errors if any exist
  if (Object.keys(allErrors).length > 0) {
    return {
      createFuelError: allErrors,
    };
  }

  const createFuel = `${process.env.HTTP_REQUEST}/fuel/create-fuel/${businessId}`;

  try {
    // Create FormData for multipart upload
    const formData = new FormData();

    // Add all form fields (we know validation.data exists because we validated above)
    if (createFuelValidation.success) {
      Object.entries(createFuelValidation.data).forEach(([key, value]) => {
        // Only append non-null values to avoid sending "null" strings
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
    }

    // 🆕 Add record origin (WEB_DASHBOARD)
    formData.append("created_from", "WEB_DASHBOARD");

    // Add the file
    formData.append("odometer_photo", odometerPhoto);

    const response = await fetch(createFuel, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
      body: formData,
    });

    const { message } = (await response.json()) as CreateFuelProps;

    if (!response.ok && message) {
      return {
        createFuelError: { createFuelErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createFuelError: {
        createFuelErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o abastecimento.",
      },
    };
  }
};

export { handleCreateFuel };
