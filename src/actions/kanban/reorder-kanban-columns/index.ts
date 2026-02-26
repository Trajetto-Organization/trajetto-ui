"use server";

import { reorderKanbanColumnsSchema } from "@/schemas/reorder-kanban-columns-schema";
import { getCookies } from "../../cookies";

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
    const response = await fetch(reorderColumns, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reorderData),
    });

    const { message } = (await response.json()) as ReorderKanbanColumnsProps;

    if (!response.ok && message) {
      return {
        reorderColumnsError: { reorderColumnsErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      reorderColumnsError: {
        reorderColumnsErrorMessage:
          "Ocorreu um erro inesperado ao tentar reordenar as colunas.",
      },
    };
  }
};

export { handleReorderKanbanColumns };
