"use server";

import { getCookies } from "../cookies";

interface DeleteVehicleTypeProps {
  businessId: string;
  vehicleTypeId: string;
}

interface DeleteVehicleTypeResponseProps {
  message: string;
}

const handleDeleteVehicleType = async ({
  businessId,
  vehicleTypeId,
}: DeleteVehicleTypeProps) => {
  const deleteVehicleType = `${process.env.HTTP_REQUEST}/vehicle-type/delete-vehicle-type/${vehicleTypeId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(deleteVehicleType, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as DeleteVehicleTypeResponseProps;

    if (!response.ok && message) {
      return { deleteVehicleTypeError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteVehicleTypeError:
        "Ocorreu um erro inesperado ao tentar deletar o tipo do veículo.",
    };
  }
};

export { handleDeleteVehicleType };
