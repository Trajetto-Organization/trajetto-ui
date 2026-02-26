"use server";

import { getCookies } from "../../cookies";

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
    const response = await fetch(deleteVehicleChecklist, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as DeleteVehicleChecklistResponseProps;

    if (!response.ok && message) {
      return { deleteVehicleChecklistError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteVehicleChecklistError:
        "Ocorreu um erro inesperado ao tentar deletar o checklist veicular.",
    };
  }
};

export { handleDeleteVehicleChecklist };
