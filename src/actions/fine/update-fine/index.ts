"use server";

import { logActionError } from "@/lib/log-action-error";
import { readBusinessIdParam } from "@/lib/business-id-param";

import { fineFormSchema } from "@/features/fine/lib/fine-form-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface UpdateFineProps {
  message: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handleUpdateFine = async (state: any, updateFineValues: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateFineError: {
        updateFineErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateFineValues.type === "RESET") {
    return {};
  }

  // Both become segments of the API path: ids or nothing.
  const businessId = readBusinessIdParam(
    updateFineValues.get("businessId") as string | null,
  );
  const fineId = String(updateFineValues.get("fineId") ?? "");

  if (!businessId || !UUID.test(fineId)) {
    return {
      updateFineError: { updateFineErrorMessage: "Multa não encontrada!" },
    };
  }

  const updateFine = `${process.env.HTTP_REQUEST}/fines/update-fine/${fineId}/business/${businessId}`;

  const fineValues = Object.fromEntries(updateFineValues.entries());
  const updateFineValidation = fineFormSchema.safeParse(fineValues);

  if (updateFineValidation.error) {
    const formatError = updateFineValidation.error.flatten();
    return {
      updateFineError: formatError.fieldErrors,
    };
  }

  const fineData = updateFineValidation.data;

  try {
    const response = await apiFetch(updateFine, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      // Empty optional fields go as "" so the edit can clear them (the API
      // reads "" as null): a payment undone, a point removed.
      body: JSON.stringify({
        ...fineData,
        payment_date: fineData.payment_date ?? "",
        location: fineData.location ?? "",
        observation: fineData.observation ?? "",
        latitude: fineData.latitude ?? "",
        longitude: fineData.longitude ?? "",
      }),
    });

    const { message } = (await response.json()) as UpdateFineProps;

    if (!response.ok) {
      return {
        updateFineError: {
          updateFineErrorMessage:
            message || "Não foi possível atualizar a multa.",
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-fine");

    return { successMessage: message };
  } catch (error) {
    logActionError("fine/update-fine", error);
    return {
      updateFineError: {
        updateFineErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a multa.",
      },
    };
  }
};

export { handleUpdateFine };
