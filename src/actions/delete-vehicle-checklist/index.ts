"use server";

import { getCookies } from "../cookies";

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
  const deleteVehicleChecklist = `${process.env.HTTP_REQUEST}/vehicle-checklist/delete-vehicle-checklist/${checklistId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

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
