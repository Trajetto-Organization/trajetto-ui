"use server";

import { getCookies } from "../../cookies";

interface RequestBranchDeletionProps {
  businessId: string;
  branchId: string;
}

interface RequestBranchDeletionResponseProps {
  message: string;
}

const handleRequestBranchDeletion = async ({
  branchId,
  businessId,
}: RequestBranchDeletionProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      requestBranchDeletionError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const requestBranchDeletion = `${process.env.HTTP_REQUEST}/branch/request-branch-deletion/${branchId}/business/${businessId}`;

  try {
    const response = await fetch(requestBranchDeletion, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as RequestBranchDeletionResponseProps;

    if (!response.ok && message) {
      return { requestBranchDeletionError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      requestBranchDeletionError:
        "Ocorreu um erro inesperado ao tentar solicitar a exclusão da filial.",
    };
  }
};

export { handleRequestBranchDeletion };
