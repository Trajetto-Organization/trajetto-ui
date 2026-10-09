"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface DeleteVehicleChecklistProps {
  businessId: string;
  checklistId: string;
}

interface DeleteVehicleChecklistResponseProps {
  message: string;
}

const handleDeleteVehicleChecklist = async ({
  businessId,
  checklistId,
}: DeleteVehicleChecklistProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteVehicleChecklistError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteVehicleChecklist = `${process.env.HTTP_REQUEST}/vehicle-checklist/delete-vehicle-checklist/${checklistId}/business/${businessId}`;

  try {
    const response = await apiFetch(deleteVehicleChecklist, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as DeleteVehicleChecklistResponseProps;

    if (!response.ok) {
      return {
        deleteVehicleChecklistError: message || refusalMessage(response.status),
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("vehicle-checklist/delete-vehicle-checklist", error);
    return {
      deleteVehicleChecklistError:
        "Ocorreu um erro inesperado ao tentar deletar o checklist veicular.",
    };
  }
};

export { handleDeleteVehicleChecklist };
