"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { reorderKanbanCardsSchema } from "@/schemas/reorder-kanban-cards-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface ReorderKanbanCardsProps {
  message: string;
}

const handleReorderKanbanCards = async (reorderData: {
  cards: Array<{ id: string; position: number; columnId: string }>;
}) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      reorderCardsError: {
        reorderCardsErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  const reorderCards = `${process.env.HTTP_REQUEST}/kanban/cards/reorder`;
  const reorderValidation = reorderKanbanCardsSchema.safeParse(reorderData);

  if (reorderValidation.error) {
    const formatError = reorderValidation.error.flatten();

    return {
      reorderCardsError: formatError.fieldErrors,
    };
  }

  try {
    const response = await apiFetch(reorderCards, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reorderData),
    });

    const { message } = (await response.json()) as ReorderKanbanCardsProps;

    if (!response.ok) {
      return {
        reorderCardsError: {
          reorderCardsErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("kanban/reorder-kanban-cards", error);
    return {
      reorderCardsError: {
        reorderCardsErrorMessage:
          "Ocorreu um erro inesperado ao tentar reordenar os cards.",
      },
    };
  }
};

export { handleReorderKanbanCards };
