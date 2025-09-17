"use server";

import { createUpdateFuelSchema } from "@/schemas/create-update-fuel-schema";
import { getCookies } from "../cookies";

interface UpdateFuelProps {
  message: string;
}

const handleUpdateFuel = async (state: any, updateFuelValues: FormData) => {
  if (updateFuelValues.type === "RESET") {
    return {};
  }

  const businessId = updateFuelValues.get("businessId");
  const fuelId = updateFuelValues.get("fuelId");

  const odometerPhoto = updateFuelValues.get("odometer_photo") as File;

  // Validate file if provided (optional for update)
  if (odometerPhoto && odometerPhoto.size > 0) {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(odometerPhoto.type)) {
      return {
        updateFuelError: {
          odometer_photo: [
            "Tipo de arquivo não suportado. Use apenas JPEG, PNG ou WebP.",
          ],
        },
      };
    }

    if (odometerPhoto.size > maxSize) {
      return {
        updateFuelError: {
          odometer_photo: ["O arquivo deve ter no máximo 5MB."],
        },
      };
    }
  }

  const updateFuel = `${process.env.HTTP_REQUEST}/fuel/update-fuel/${fuelId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  // Extract form values excluding the file
  const formValues: Record<string, string> = {};
  for (const [key, value] of updateFuelValues.entries()) {
    if (key !== "odometer_photo" && typeof value === "string") {
      formValues[key] = value;
    }
  }

  const updateFuelValidation = createUpdateFuelSchema.safeParse(formValues);

  if (updateFuelValidation.error) {
    const formatError = updateFuelValidation.error.flatten();

    return {
      updateFuelError: formatError.fieldErrors,
    };
  }

  try {
    // Create FormData for multipart upload
    const formData = new FormData();

    // Add all form fields
    Object.entries(updateFuelValidation.data).forEach(([key, value]) => {
      // For update, we need to send all fields including empty ones to clear values
      if (value !== undefined) {
        // Convert null to empty string for optional fields like notes
        const stringValue = value === null ? "" : String(value);
        formData.append(key, stringValue);
      }
    });

    // Add the file if provided
    if (odometerPhoto && odometerPhoto.size > 0) {
      formData.append("odometer_photo", odometerPhoto);
    }

    const response = await fetch(updateFuel, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
      body: formData,
    });

    const { message } = (await response.json()) as UpdateFuelProps;

    if (!response.ok && message) {
      return {
        updateFuelError: { updateFuelErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateFuelError: {
        updateFuelErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o abastecimento.",
      },
    };
  }
};

export { handleUpdateFuel };
