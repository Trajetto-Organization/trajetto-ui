"use server";

import { getCookies } from "../../cookies";

interface DeleteBranchProps {
  businessId: string;
  branchId: string;
}

interface DeleteBranchResponseProps {
  message: string;
}

const handleDeleteBranch = async ({
  branchId,
  businessId,
}: DeleteBranchProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteBranchError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteBranch = `${process.env.HTTP_REQUEST}/branch/delete-branch/${branchId}/business/${businessId}`;

  try {
    const response = await fetch(deleteBranch, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteBranchResponseProps;

    if (!response.ok && message) {
      return { deleteBranchError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteBranchError:
        "Ocorreu um erro inesperado ao tentar deletar a filial.",
    };
  }
};

export { handleDeleteBranch };
