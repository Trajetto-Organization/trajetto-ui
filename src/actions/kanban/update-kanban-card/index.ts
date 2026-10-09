"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { updateKanbanCardSchema } from "@/schemas/update-kanban-card-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface UpdateKanbanCardProps {
  message: string;
}

const handleUpdateKanbanCard = async (
  state: any,
  updateCardValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateCardError: {
        updateCardErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateCardValues.type === "RESET") {
    return {};
  }

  const cardId = updateCardValues.get("cardId") as string;
  if (!cardId) {
    return {
      updateCardError: {
        cardId: ["ID do card é obrigatório"],
      },
    };
  }

  const updateCard = `${process.env.HTTP_REQUEST}/kanban/card/update/${cardId}`;
  const cardValues = Object.fromEntries(updateCardValues.entries());

  // Remove cardId from values as it's in the URL
  delete cardValues.cardId;
  const updateCardValidation = updateKanbanCardSchema.safeParse(cardValues);

  if (updateCardValidation.error) {
    const formatError = updateCardValidation.error.flatten();
    return {
      updateCardError: formatError.fieldErrors,
    };
  }

  const cardData = updateCardValidation.data;

  try {
    const response = await apiFetch(updateCard, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cardData),
    });

    const { message } = (await response.json()) as UpdateKanbanCardProps;

    if (!response.ok) {
      return {
        updateCardError: {
          updateCardErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("kanban/update-kanban-card", error);
    return {
      updateCardError: {
        updateCardErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o card.",
      },
    };
  }
};

export { handleUpdateKanbanCard };
