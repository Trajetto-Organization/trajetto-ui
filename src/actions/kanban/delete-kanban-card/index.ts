"use server";

import { getCookies } from "../../cookies";

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
    const response = await fetch(deleteCard, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteKanbanCardProps;

    if (!response.ok && message) {
      return {
        deleteCardError: message,
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteCardError: "Ocorreu um erro inesperado ao tentar deletar o card.",
    };
  }
};

export { handleDeleteKanbanCard };
