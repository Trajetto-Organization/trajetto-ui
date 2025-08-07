"use server";

import { getCookies } from "../cookies";

interface DeleteDriverProps {
  businessId: string;
  driverId: string;
}

interface DeleteDriverResponseProps {
  message: string;
}

const handleDeleteDriver = async ({
  businessId,
  driverId,
}: DeleteDriverProps) => {
  const deleteDriver = `${process.env.HTTP_REQUEST}/driver/delete-driver/${driverId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(deleteDriver, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteDriverResponseProps;

    if (!response.ok && message) {
      return { deleteDriverError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteDriverError:
        "Ocorreu um erro inesperado ao tentar deletar o motorista.",
    };
  }
};

export { handleDeleteDriver };
