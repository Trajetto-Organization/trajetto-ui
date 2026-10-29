"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface DeleteStatusChangeReasonProps {
  businessId: string;
  reasonId: string;
}

interface DeleteStatusChangeReasonResponseProps {
  message: string;
}

/**
 * Removes a word the catalogue never spent.
 *
 * A reason already cited by an event answers 409 and names how many depend on
 * it — the trail would otherwise stop naming a decision somebody made. That
 * message is the whole point of the call, so it is surfaced verbatim.
 */
const handleDeleteStatusChangeReason = async ({
  businessId,
  reasonId,
}: DeleteStatusChangeReasonProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteStatusChangeReasonError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteStatusChangeReason = `${process.env.HTTP_REQUEST}/status-change-reason/delete-status-change-reason/${reasonId}/business/${businessId}`;

  try {
    const response = await apiFetch(deleteStatusChangeReason, {
      credentials: "include",
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenAccess}` },
    });

    const { message } =
      (await response.json()) as DeleteStatusChangeReasonResponseProps;

    if (!response.ok) {
      return {
        deleteStatusChangeReasonError:
          message || refusalMessage(response.status),
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-status-change-reason");

    return { successMessage: message };
  } catch (error) {
    logActionError("status-change-reason/delete-status-change-reason", error);
    return {
      deleteStatusChangeReasonError:
        "Ocorreu um erro inesperado ao tentar deletar o motivo.",
    };
  }
};

export { handleDeleteStatusChangeReason };
