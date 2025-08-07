"use server";

import { getCookies } from "../cookies";

interface DeleteSupplierProps {
  businessId: string;
  supplierId: string;
}

interface DeleteSupplierResponseProps {
  message: string;
}

const handleDeleteSupplier = async ({
  businessId,
  supplierId,
}: DeleteSupplierProps) => {
  const deleteSupplier = `${process.env.HTTP_REQUEST}/supplier/delete-supplier/${supplierId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(deleteSupplier, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteSupplierResponseProps;

    if (!response.ok && message) {
      return { deleteSupplierError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteSupplierError:
        "Ocorreu um erro inesperado ao tentar deletar o fornecedor.",
    };
  }
};

export { handleDeleteSupplier };
