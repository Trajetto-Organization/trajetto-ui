"use server";

import { getCookies } from "../cookies";

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
  const deleteBranch = `${process.env.HTTP_REQUEST}/branch/delete-branch/${branchId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

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
