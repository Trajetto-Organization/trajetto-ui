"use server";

import { getCookies } from "../../cookies";

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
    const response = await fetch(deleteOccurrenceType, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as DeleteOccurrenceTypeResponseProps;

    if (!response.ok && message) {
      return { deleteOccurrenceTypeError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteOccurrenceTypeError:
        "Ocorreu um erro inesperado ao tentar deletar o tipo de ocorrência.",
    };
  }
};

export { handleDeleteOccurrenceType };
