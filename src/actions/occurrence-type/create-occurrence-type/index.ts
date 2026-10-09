"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateOccurrenceTypeSchema } from "@/schemas/create-update-occurrence-type-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface CreateOccurrenceTypeProps {
  message: string;
}

const handleCreateOccurrenceType = async (
  state: any,
  createOccurrenceTypeValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createOccurrenceTypeError: {
        createOccurrenceTypeErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createOccurrenceTypeValues.type === "RESET") {
    return {};
  }

  const businessId = createOccurrenceTypeValues.get("businessId");
  const createOccurrenceType = `${process.env.HTTP_REQUEST}/occurrence-type/create-occurrence-type/${businessId}`;

  const occurrenceTypeValues = Object.fromEntries(
    createOccurrenceTypeValues.entries(),
  );

  const createOccurrenceTypeValidation =
    createUpdateOccurrenceTypeSchema.safeParse(occurrenceTypeValues);

  if (createOccurrenceTypeValidation.error) {
    const formatError = createOccurrenceTypeValidation.error.flatten();

    return {
      createOccurrenceTypeError: formatError.fieldErrors,
    };
  }

  // is_active is not part of creating: a new type is always active.
  const { is_active: _isActive, ...occurrenceTypeData } =
    createOccurrenceTypeValidation.data;

  try {
    const response = await apiFetch(createOccurrenceType, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...occurrenceTypeData,
        requires_photo: occurrenceTypeData.requires_photo ?? false,
        blocks_delivery: occurrenceTypeData.blocks_delivery ?? false,
        requires_authorization:
          occurrenceTypeData.requires_authorization ?? false,
        requires_receipt_photo:
          occurrenceTypeData.requires_receipt_photo ?? false,
        requires_signature: occurrenceTypeData.requires_signature ?? false,
        form_fields: occurrenceTypeData.form_fields ?? null,
      }),
    });

    const { message } = (await response.json()) as CreateOccurrenceTypeProps;

    if (!response.ok) {
      return {
        createOccurrenceTypeError: {
          createOccurrenceTypeErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("occurrence-type/create-occurrence-type", error);
    return {
      createOccurrenceTypeError: {
        createOccurrenceTypeErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o tipo de ocorrência.",
      },
    };
  }
};

export { handleCreateOccurrenceType };
