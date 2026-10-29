"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateStatusChangeReasonSchema } from "@/schemas/create-update-status-change-reason-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface UpdateStatusChangeReasonProps {
  message: string;
}

const handleUpdateStatusChangeReason = async (
  state: any,
  updateStatusChangeReasonValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateStatusChangeReasonError: {
        updateStatusChangeReasonErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateStatusChangeReasonValues.type === "RESET") {
    return {};
  }

  const businessId = updateStatusChangeReasonValues.get("businessId");
  const reasonId = updateStatusChangeReasonValues.get("reasonId");

  const updateStatusChangeReason = `${process.env.HTTP_REQUEST}/status-change-reason/update-status-change-reason/${reasonId}/business/${businessId}`;

  const reasonValues = Object.fromEntries(
    updateStatusChangeReasonValues.entries(),
  );

  const validation =
    createUpdateStatusChangeReasonSchema.safeParse(reasonValues);

  if (validation.error) {
    return {
      updateStatusChangeReasonError: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiFetch(updateStatusChangeReason, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...validation.data,
        is_active: validation.data.is_active ?? false,
      }),
    });

    const { message } =
      (await response.json()) as UpdateStatusChangeReasonProps;

    if (!response.ok) {
      return {
        updateStatusChangeReasonError: {
          updateStatusChangeReasonErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-status-change-reason");

    return { successMessage: message };
  } catch (error) {
    logActionError("status-change-reason/update-status-change-reason", error);
    return {
      updateStatusChangeReasonError: {
        updateStatusChangeReasonErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o motivo.",
      },
    };
  }
};

export { handleUpdateStatusChangeReason };
