"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface DeletePartProps {
  businessId: string;
  partId: string;
}

interface DeletePartResponseProps {
  message: string;
}

const handleDeletePart = async ({ businessId, partId }: DeletePartProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deletePartError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deletePart = `${process.env.HTTP_REQUEST}/part/delete-part/${partId}/business/${businessId}`;

  try {
    const response = await apiFetch(deletePart, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeletePartResponseProps;

    if (!response.ok) {
      return { deletePartError: message || refusalMessage(response.status) };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-part");

    return { successMessage: message };
  } catch (error) {
    logActionError("part/delete-part", error);
    return {
      deletePartError: "Ocorreu um erro inesperado ao tentar deletar a peça.",
    };
  }
};

export { handleDeletePart };
