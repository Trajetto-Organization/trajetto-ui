"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface DeleteOccurrenceTypeProps {
  businessId: string;
  occurrenceTypeId: string;
}

interface DeleteOccurrenceTypeResponseProps {
  message: string;
}

const handleDeleteOccurrenceType = async ({
  businessId,
  occurrenceTypeId,
}: DeleteOccurrenceTypeProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteOccurrenceTypeError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteOccurrenceType = `${process.env.HTTP_REQUEST}/occurrence-type/delete-occurrence-type/${occurrenceTypeId}/business/${businessId}`;

  try {
    const response = await apiFetch(deleteOccurrenceType, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as DeleteOccurrenceTypeResponseProps;

    if (!response.ok) {
      return {
        deleteOccurrenceTypeError: message || refusalMessage(response.status),
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("occurrence-type/delete-occurrence-type", error);
    return {
      deleteOccurrenceTypeError:
        "Ocorreu um erro inesperado ao tentar deletar o tipo de ocorrência.",
    };
  }
};

export { handleDeleteOccurrenceType };
