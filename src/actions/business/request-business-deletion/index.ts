"use server";

import { getCookies } from "../../cookies";

interface RequestBusinessDeletionResponseProps {
  message: string;
}

const handleRequestBusinessDeletion = async (businessId: string) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      requestBusinessDeletionError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const requestBusinessDeletion = `${process.env.HTTP_REQUEST}/business/request-business-deletion/${businessId}`;

  try {
    const response = await fetch(requestBusinessDeletion, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as RequestBusinessDeletionResponseProps;

    if (!response.ok && message) {
      return { requestBusinessDeletionError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      requestBusinessDeletionError:
        "Ocorreu um erro inesperado ao tentar solicitar a exclusão da empresa.",
    };
  }
};

export { handleRequestBusinessDeletion };
