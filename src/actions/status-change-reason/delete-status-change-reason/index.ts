"use server";

import { getCookies } from "../../cookies";

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
    const response = await fetch(deleteStatusChangeReason, {
      credentials: "include",
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenAccess}` },
    });

    const { message } =
      (await response.json()) as DeleteStatusChangeReasonResponseProps;

    if (!response.ok && message) {
      return { deleteStatusChangeReasonError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteStatusChangeReasonError:
        "Ocorreu um erro inesperado ao tentar deletar o motivo.",
    };
  }
};

export { handleDeleteStatusChangeReason };
