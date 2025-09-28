"use server";

import { createUpdateVehicleChecklistSchema } from "@/schemas/create-update-vehicle-checklist-schema";
import { getCookies } from "../cookies";

interface CreateVehicleChecklistProps {
  message: string;
}

const handleCreateVehicleChecklist = async (
  state: any,
  createChecklistValues: FormData,
) => {
  if (createChecklistValues.type === "RESET") {
    return {};
  }

  const businessId = createChecklistValues.get("businessId");

  // Extract form values excluding files
  const formValues: Record<string, any> = {};
  const fileFields: Record<string, File[]> = {};

  for (const [key, value] of createChecklistValues.entries()) {
    if (value instanceof File) {
      // Handle file uploads
      if (!fileFields[key]) {
        fileFields[key] = [];
      }
      fileFields[key].push(value);
    } else if (typeof value === "string") {
      // Handle form fields
      // Convert string booleans to actual booleans
      if (value === "true") {
        formValues[key] = true;
      } else if (value === "false") {
        formValues[key] = false;
      } else {
        formValues[key] = value;
      }
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

  // Validate required photos
  const requiredPhotoFields = [
    "current_mileage",
    "fuel_level_adequate",
    "tires_condition",
  ];

  for (const field of requiredPhotoFields) {
    const files = fileFields[field];
    if (!files || files.length === 0) {
      allErrors[field] = [
        `A foto de ${
          field === "current_mileage"
            ? "quilometragem"
            : field === "fuel_level_adequate"
              ? "nível de combustível"
              : "condição dos pneus"
        } é obrigatória.`,
      ];
    } else {
      // Validate each file
      for (const file of files) {
        const allowedTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
          allErrors[field] = [
            "Tipo de arquivo não suportado. Use apenas JPEG, JPG, PNG ou WebP.",
          ];
          break;
        } else if (file.size > maxSize) {
          allErrors[field] = ["O arquivo deve ter no máximo 5MB."];
          break;
        }
      }
    }
  }

  // Validate optional photos
  Object.entries(fileFields).forEach(([fieldName, files]) => {
    if (!requiredPhotoFields.includes(fieldName)) {
      files.forEach((file) => {
        const allowedTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
          if (!allErrors[fieldName]) allErrors[fieldName] = [];
          allErrors[fieldName].push(
            "Tipo de arquivo não suportado. Use apenas JPEG, JPG, PNG ou WebP.",
          );
        } else if (file.size > maxSize) {
          if (!allErrors[fieldName]) allErrors[fieldName] = [];
          allErrors[fieldName].push("O arquivo deve ter no máximo 5MB.");
        }
      });
    }
  });

  // Return ALL errors if any exist
  if (Object.keys(allErrors).length > 0) {
    return {
      createVehicleChecklistError: allErrors,
    };
  }

  const createVehicleChecklist = `${process.env.HTTP_REQUEST}/vehicle-checklist/create-vehicle-checklist/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  try {
    // Create FormData for multipart upload
    const formData = new FormData();

    // Add all form fields (we know validation.data exists because we validated above)
    if (createChecklistValidation.success) {
      Object.entries(createChecklistValidation.data).forEach(([key, value]) => {
        // Only append non-null values to avoid sending "null" strings
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
    }

    // Add all files
    Object.entries(fileFields).forEach(([fieldName, files]) => {
      files.forEach((file) => {
        formData.append(fieldName, file);
      });
    });

    const response = await fetch(createVehicleChecklist, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
      body: formData,
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
