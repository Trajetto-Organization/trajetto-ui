"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

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
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteSupplierError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteSupplier = `${process.env.HTTP_REQUEST}/supplier/delete-supplier/${supplierId}/business/${businessId}`;

  try {
    const response = await apiFetch(deleteSupplier, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteSupplierResponseProps;

    if (!response.ok) {
      return {
        deleteSupplierError: message || refusalMessage(response.status),
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("supplier/delete-supplier", error);
    return {
      deleteSupplierError:
        "Ocorreu um erro inesperado ao tentar deletar o fornecedor.",
    };
  }
};

export { handleDeleteSupplier };
