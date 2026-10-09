"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { reorderKanbanColumnsSchema } from "@/schemas/reorder-kanban-columns-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface ReorderKanbanColumnsProps {
  message: string;
}

const handleReorderKanbanColumns = async (reorderData: {
  businessId: string;
  columns: Array<{ id: string; position: number }>;
}) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      reorderColumnsError: {
        reorderColumnsErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  const reorderColumns = `${process.env.HTTP_REQUEST}/kanban/columns/reorder`;
  const reorderValidation = reorderKanbanColumnsSchema.safeParse(reorderData);

  if (reorderValidation.error) {
    const formatError = reorderValidation.error.flatten();

    return {
      reorderColumnsError: formatError.fieldErrors,
    };
  }

  try {
    const response = await apiFetch(reorderColumns, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reorderData),
    });

    const { message } = (await response.json()) as ReorderKanbanColumnsProps;

    if (!response.ok) {
      return {
        reorderColumnsError: {
          reorderColumnsErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("kanban/reorder-kanban-columns", error);
    return {
      reorderColumnsError: {
        reorderColumnsErrorMessage:
          "Ocorreu um erro inesperado ao tentar reordenar as colunas.",
      },
    };
  }
};

export { handleReorderKanbanColumns };
