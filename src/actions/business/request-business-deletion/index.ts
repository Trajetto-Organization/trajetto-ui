"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

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
    const response = await apiFetch(requestBusinessDeletion, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as RequestBusinessDeletionResponseProps;

    if (!response.ok) {
      return {
        requestBusinessDeletionError:
          message || refusalMessage(response.status),
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("business/request-business-deletion", error);
    return {
      requestBusinessDeletionError:
        "Ocorreu um erro inesperado ao tentar solicitar a exclusão da empresa.",
    };
  }
};

export { handleRequestBusinessDeletion };
