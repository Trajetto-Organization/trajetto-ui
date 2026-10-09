"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createKanbanColumnSchema } from "@/schemas/create-kanban-column-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface CreateKanbanColumnProps {
  message: string;
}

const handleCreateKanbanColumn = async (
  state: any,
  createColumnValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createColumnError: {
        createColumnErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createColumnValues.type === "RESET") {
    return {};
  }

  const businessId = createColumnValues.get("businessId");
  if (!businessId) {
    return {
      createColumnError: {
        businessId: ["Selecione uma empresa para continuar"],
      },
    };
  }

  const createColumn = `${process.env.HTTP_REQUEST}/kanban/column/create/${businessId}`;

  const columnValues = Object.fromEntries(createColumnValues.entries());
  const createColumnValidation =
    createKanbanColumnSchema.safeParse(columnValues);

  if (createColumnValidation.error) {
    const formatError = createColumnValidation.error.flatten();

    return {
      createColumnError: formatError.fieldErrors,
    };
  }

  const columnData = createColumnValidation.data;

  try {
    const response = await apiFetch(createColumn, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(columnData),
    });

    const { message } = (await response.json()) as CreateKanbanColumnProps;

    if (!response.ok) {
      return {
        createColumnError: {
          createColumnErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("kanban/create-kanban-column", error);
    return {
      createColumnError: {
        createColumnErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a coluna.",
      },
    };
  }
};

export { handleCreateKanbanColumn };
