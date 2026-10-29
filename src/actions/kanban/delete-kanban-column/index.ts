"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

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
    const response = await apiFetch(deleteColumn, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteKanbanColumnProps;

    if (!response.ok) {
      return {
        deleteColumnError: message || refusalMessage(response.status),
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("kanban/delete-kanban-column", error);
    return {
      deleteColumnError:
        "Ocorreu um erro inesperado ao tentar deletar a coluna.",
    };
  }
};

export { handleDeleteKanbanColumn };
