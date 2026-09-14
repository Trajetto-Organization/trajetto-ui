"use server";

import { getCookies } from "../../cookies";

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

interface ImportResultItem {
  filename: string;
  outcome: "imported" | "duplicated" | "invalid";
  invoice_key: string | null;
  recipient_name: string | null;
  message: string | null;
}

interface ImportSummary {
  imported: number;
  duplicated: number;
  invalid: number;
  created_shippers: string[];
  results: ImportResultItem[];
}

const importDeliveryXml = async (
  businessId: string,
  files: Array<{ filename: string; content: string }>,
  options?: { shipperId?: string; scheduled_date?: string },
): Promise<ActionResponse<ImportSummary>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/delivery/import-xml/${businessId}`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files,
          ...(options?.shipperId && { shipperId: options.shipperId }),
          ...(options?.scheduled_date && {
            scheduled_date: options.scheduled_date,
          }),
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao importar os arquivos.",
      };
    }

    return {
      success: true,
      message: result.message,
      data: result.data as ImportSummary,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao importar os arquivos.",
    };
  }
};

export { importDeliveryXml };
export type { ImportSummary, ImportResultItem };
