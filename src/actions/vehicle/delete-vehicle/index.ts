"use server";

import { getCookies } from "../../cookies";

interface DeleteVehicleProps {
  businessId: string;
  vehicleId: string;
}

interface DeleteVehicleResponseProps {
  message: string;
}

const handleDeleteVehicle = async ({
  businessId,
  vehicleId,
}: DeleteVehicleProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteVehicleError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteVehicle = `${process.env.HTTP_REQUEST}/vehicle/delete-vehicle/${vehicleId}/business/${businessId}`;

  try {
    const response = await fetch(deleteVehicle, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteVehicleResponseProps;

    if (!response.ok && message) {
      return { deleteVehicleError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteVehicleError:
        "Ocorreu um erro inesperado ao tentar deletar o veículo.",
    };
  }
};

export { handleDeleteVehicle };
