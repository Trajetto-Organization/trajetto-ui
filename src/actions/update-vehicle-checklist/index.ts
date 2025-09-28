"use server";

import { createUpdateVehicleChecklistSchema } from "@/schemas/create-update-vehicle-checklist-schema";
import { getCookies } from "../cookies";

interface UpdateVehicleChecklistProps {
  message: string;
}

const handleUpdateVehicleChecklist = async (
  state: any,
  updateChecklistValues: FormData,
) => {
  if (updateChecklistValues.type === "RESET") {
    return {};
  }

  const businessId = updateChecklistValues.get("businessId");
  const checklistId = updateChecklistValues.get("checklistId");

  const photosToRemoveStr = updateChecklistValues.get(
    "photosToRemove",
  ) as string;

  // Extract form values excluding files
  const formValues: Record<string, any> = {};
  const fileFields: Record<string, File[]> = {};

  const photosToRemove: string[] = photosToRemoveStr
    ? JSON.parse(photosToRemoveStr)
    : [];

  for (const [key, value] of updateChecklistValues.entries()) {
    if (value instanceof File) {
      // Handle file uploads
      if (!fileFields[key]) {
        fileFields[key] = [];
      }
      fileFields[key].push(value);
    } else if (
      typeof value === "string" &&
      key !== "photosToRemove" &&
      key !== "businessId" &&
      key !== "checklistId"
    ) {
      // Handle form fields (exclude metadata fields)
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

  // Validate optional photos (only if being updated)
  Object.entries(fileFields).forEach(([fieldName, files]) => {
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
  });

  // Return ALL errors if any exist
  if (Object.keys(allErrors).length > 0) {
    return {
      updateVehicleChecklistError: allErrors,
    };
  }

  const updateVehicleChecklist = `${process.env.HTTP_REQUEST}/vehicle-checklist/update-vehicle-checklist/${checklistId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  try {
    // Create FormData for multipart upload
    const formData = new FormData();

    // Add all form fields (only if validation succeeded)
    if (updateChecklistValidation.success) {
      Object.entries(updateChecklistValidation.data).forEach(([key, value]) => {
        // For update, we need to send all fields including empty ones to clear values
        if (value !== undefined) {
          // For notes field, preserve null as empty string to trigger backend null conversion
          // For other fields, convert normally
          const stringValue = value === null ? "" : String(value);
          formData.append(key, stringValue);
        }
      });
    }

    // Add all files (if any were provided) with field name prefixed like in create
    Object.entries(fileFields).forEach(([fieldName, files]) => {
      files.forEach((file, index) => {
        // Create new file with mobile-like naming pattern: fieldName_timestamp_index.extension
        const fileExtension = file.name.split(".").pop() || "jpg";
        const newFileName = `${fieldName}_${Date.now()}_${index}.${fileExtension}`;

        // Create a new File object with the new name
        const renamedFile = new File([file], newFileName, {
          type: file.type,
        });

        formData.append(fieldName, renamedFile);
      });
    });

    // Add photos to remove (if any)
    if (photosToRemove.length > 0) {
      formData.append("photosToRemove", JSON.stringify(photosToRemove));
    }

    const response = await fetch(updateVehicleChecklist, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
      body: formData,
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
