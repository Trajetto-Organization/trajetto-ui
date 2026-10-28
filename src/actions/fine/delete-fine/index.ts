"use server";

import { logActionError } from "@/lib/log-action-error";
import { readBusinessIdParam } from "@/lib/business-id-param";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface DeleteFineProps {
  fineId: string;

  /**
   * The fine's own company. The route carries it since the cross-tenant fix,
   * and this action kept calling the old path — so deleting a fine answered
   * 404 "Route DELETE:/fines/delete-fine/… not found" and the fine stayed.
   */
  businessId: string;
}

interface DeleteFineResponseProps {
  message?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handleDeleteFine = async ({ fineId, businessId }: DeleteFineProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteFineError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  // Both become segments of the API path: ids or nothing, like the edit.
  const company = readBusinessIdParam(businessId);

  if (!company || !UUID.test(fineId)) {
    return { deleteFineError: "Multa não encontrada!" };
  }

  const deleteFine = `${process.env.HTTP_REQUEST}/fines/delete-fine/${fineId}/business/${company}`;

  try {
    const response = await apiFetch(deleteFine, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response
      .json()
      .catch(() => ({}))) as DeleteFineResponseProps;

    // Any refusal is an error, with or without a sentence: a failure whose
    // body had no `message` used to be reported as "Multa deletada".
    if (!response.ok) {
      return {
        deleteFineError: message || "Não foi possível deletar a multa.",
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-fine");

    return { successMessage: message || "Multa deletada com sucesso!" };
  } catch (error) {
    logActionError("fine/delete-fine", error);
    return {
      deleteFineError: "Ocorreu um erro inesperado ao tentar deletar a multa.",
    };
  }
};

export { handleDeleteFine };
