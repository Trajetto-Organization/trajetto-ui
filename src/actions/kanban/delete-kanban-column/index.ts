"use server";

import { getCookies } from "../../cookies";

interface DeleteKanbanColumnProps {
  message: string;
}

interface HandleDeleteKanbanColumnParams {
  businessId: string;
  columnId: string;
}

const handleDeleteKanbanColumn = async ({
  businessId,
  columnId,
}: HandleDeleteKanbanColumnParams) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteColumnError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteColumn = `${process.env.HTTP_REQUEST}/kanban/column/delete/${columnId}/business/${businessId}`;

  try {
    const response = await fetch(deleteColumn, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteKanbanColumnProps;

    if (!response.ok && message) {
      return {
        deleteColumnError: message,
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteColumnError:
        "Ocorreu um erro inesperado ao tentar deletar a coluna.",
    };
  }
};

export { handleDeleteKanbanColumn };
