"use server";

import {
  NEW_DELETION_CODE_MESSAGE,
  errorCodeOf,
  needsNewDeletionCode,
  refusalMessage,
} from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface DeleteBusinessProps {
  businessId: string;
  code: string;
}

interface DeleteBusinessResponseProps {
  message?: string;
  code?: string;
}

const handleDeleteBusiness = async ({
  businessId,
  code,
}: DeleteBusinessProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteBusinessError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  if (!code) {
    return {
      deleteBusinessError: "Código de confirmação é obrigatório.",
    };
  }

  const deleteBusiness = `${process.env.HTTP_REQUEST}/business/delete-business/${businessId}`;

  try {
    const response = await apiFetch(deleteBusiness, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    const body = (await response.json()) as DeleteBusinessResponseProps;
    const { message } = body;

    if (!response.ok) {
      const errorCode = errorCodeOf(body, response.headers);

      // No pending request (409 BUSINESS_DELETION_NOT_REQUESTED) or an
      // expired code: retyping cannot work, so the form asks for a new code
      // instead of reading it as a generic conflict.
      if (needsNewDeletionCode(errorCode)) {
        return {
          deleteBusinessError: message || NEW_DELETION_CODE_MESSAGE,
          errorCode,
          requestNewCode: true,
        };
      }

      return {
        deleteBusinessError: message || refusalMessage(response.status),
        errorCode,
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("delete-business");

    return { successMessage: message };
  } catch (error) {
    logActionError("business/delete-business", error);
    return {
      deleteBusinessError:
        "Ocorreu um erro inesperado ao tentar deletar a empresa.",
    };
  }
};

export { handleDeleteBusiness };
