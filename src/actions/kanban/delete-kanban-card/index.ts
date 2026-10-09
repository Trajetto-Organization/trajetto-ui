"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface DeleteKanbanCardProps {
  message: string;
}

interface HandleDeleteKanbanCardParams {
  cardId: string;
}

const handleDeleteKanbanCard = async ({
  cardId,
}: HandleDeleteKanbanCardParams) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteCardError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteCard = `${process.env.HTTP_REQUEST}/kanban/card/delete/${cardId}`;

  try {
    const response = await apiFetch(deleteCard, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteKanbanCardProps;

    if (!response.ok) {
      return {
        deleteCardError: message || refusalMessage(response.status),
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("kanban/delete-kanban-card", error);
    return {
      deleteCardError: "Ocorreu um erro inesperado ao tentar deletar o card.",
    };
  }
};

export { handleDeleteKanbanCard };
