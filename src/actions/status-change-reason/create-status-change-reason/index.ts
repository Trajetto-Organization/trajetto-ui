"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateStatusChangeReasonSchema } from "@/schemas/create-update-status-change-reason-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface CreateStatusChangeReasonProps {
  message: string;
}

const handleCreateStatusChangeReason = async (
  state: any,
  createStatusChangeReasonValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createStatusChangeReasonError: {
        createStatusChangeReasonErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createStatusChangeReasonValues.type === "RESET") {
    return {};
  }

  const businessId = createStatusChangeReasonValues.get("businessId");
  const createStatusChangeReason = `${process.env.HTTP_REQUEST}/status-change-reason/create-status-change-reason/${businessId}`;

  const reasonValues = Object.fromEntries(
    createStatusChangeReasonValues.entries(),
  );

  const validation =
    createUpdateStatusChangeReasonSchema.safeParse(reasonValues);

  if (validation.error) {
    return {
      createStatusChangeReasonError: validation.error.flatten().fieldErrors,
    };
  }

  // is_active is not part of creating: a new reason is always active.
  const { is_active: _isActive, ...reasonData } = validation.data;

  try {
    const response = await apiFetch(createStatusChangeReason, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reasonData),
    });

    const { message } =
      (await response.json()) as CreateStatusChangeReasonProps;

    if (!response.ok) {
      return {
        createStatusChangeReasonError: {
          createStatusChangeReasonErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-status-change-reason");

    return { successMessage: message };
  } catch (error) {
    logActionError("status-change-reason/create-status-change-reason", error);
    return {
      createStatusChangeReasonError: {
        createStatusChangeReasonErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o motivo.",
      },
    };
  }
};

export { handleCreateStatusChangeReason };
