"use server";

import { getCookies } from "../cookies";

interface DeleteFuelTypeProps {
  businessId: string;
  fuelTypeId: string;
}

interface DeleteFuelTypeResponseProps {
  message: string;
}

const handleDeleteFuelType = async ({
  businessId,
  fuelTypeId,
}: DeleteFuelTypeProps) => {
  const deleteFuelType = `${process.env.HTTP_REQUEST}/fuel-type/delete-fuel-type/${fuelTypeId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(deleteFuelType, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteFuelTypeResponseProps;

    if (!response.ok && message) {
      return { deleteFuelTypeError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteFuelTypeError:
        "Ocorreu um erro inesperado ao tentar deletar o tipo do combustível.",
    };
  }
};

export { handleDeleteFuelType };
