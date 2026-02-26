"use server";

import { updateKanbanColumnSchema } from "@/schemas/update-kanban-column-schema";
import { getCookies } from "../../cookies";

interface UpdateKanbanColumnProps {
  message: string;
}

const handleUpdateKanbanColumn = async (
  state: any,
  updateColumnValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateColumnError: {
        updateColumnErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateColumnValues.type === "RESET") {
    return {};
  }

  const businessId = updateColumnValues.get("businessId") as string;
  const columnId = updateColumnValues.get("columnId") as string;

  if (!businessId || !columnId) {
    return {
      updateColumnError: {
        updateColumnErrorMessage: "ID da empresa ou da coluna não fornecido",
      },
    };
  }

  const updateColumn = `${process.env.HTTP_REQUEST}/kanban/column/update/${columnId}/business/${businessId}`;

  const columnValues = Object.fromEntries(updateColumnValues.entries());
  const updateColumnValidation =
    updateKanbanColumnSchema.safeParse(columnValues);

  if (updateColumnValidation.error) {
    const formatError = updateColumnValidation.error.flatten();

    return {
      updateColumnError: formatError.fieldErrors,
    };
  }

  const columnData = updateColumnValidation.data;

  try {
    const response = await fetch(updateColumn, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(columnData),
    });

    const { message } = (await response.json()) as UpdateKanbanColumnProps;

    if (!response.ok && message) {
      return {
        updateColumnError: { updateColumnErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateColumnError: {
        updateColumnErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a coluna.",
      },
    };
  }
};

export { handleUpdateKanbanColumn };
