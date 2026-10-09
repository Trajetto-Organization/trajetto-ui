"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface ExportFuelResponse {
  success?: boolean;
  message?: string;
  base64Data?: string;
  filename?: string;
  totalRecords?: number;
  mimeType?: string;
}

type ExportFormat = "csv" | "excel";

/**
 * The list's filters the export may carry (decision 5.8): the company the
 * MASTER is looking at and the facets. Anything else is dropped — an
 * exported server action is an endpoint, and these become a query string.
 */
const FILTER_PARAMS = ["businessId", "branchId", "vehicleId", "fuelTypeId"];

const UUID_LIST =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(,[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})*$/i;

function exportFilterParams(
  filters: Record<string, string> | undefined,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters ?? {}).filter(
      ([name, value]) =>
        FILTER_PARAMS.includes(name) &&
        typeof value === "string" &&
        UUID_LIST.test(value),
    ),
  );
}

const handleExportFuel = async (
  search?: string,
  format: ExportFormat = "csv",
  filters?: Record<string, string>,
): Promise<ExportFuelResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const params = new URLSearchParams();

    if (search) params.append("search", search);
    if (format) params.append("format", format);

    for (const [name, value] of Object.entries(exportFilterParams(filters))) {
      params.append(name, value);
    }

    const exportUrl = `${process.env.HTTP_REQUEST}/fuel/export-fuel?${params.toString()}`;
    const response = await apiFetch(exportUrl, {
      credentials: "include",
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    if (!response.ok) {
      // The API's own sentence ("Não existem abastecimentos para
      // exportar!"), never the raw body: the toast used to read
      // `Erro ao gerar relatório: 400 - {"code":…}`.
      const body = (await response.json().catch(() => null)) as {
        message?: unknown;
      } | null;

      return {
        success: false,
        message:
          typeof body?.message === "string" && body.message
            ? body.message
            : "Não foi possível gerar o relatório de abastecimentos.",
      };
    }

    const contentDisposition = response.headers.get("content-disposition");
    const mimeType = response.headers.get("content-type") || "";

    const totalRecords = response.headers.get("X-Total-Records");
    // The API names the file with the company's day (decision 1.2); the
    // fallback carries no date rather than the UTC one, which is tomorrow
    // after 21:00 in São Paulo.
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
      : `relatorio-abastecimentos.${format === "csv" ? "csv" : "xlsx"}`;

    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    return {
      success: true,
      base64Data,
      filename,
      totalRecords: totalRecords ? parseInt(totalRecords) : 0,
      mimeType,
      message: `Relatório gerado com sucesso!`,
    };
  } catch (error) {
    logActionError("fuel/export-fuel", error);
    return {
      success: false,
      // The detail goes to the log above, not to the person.
      message:
        "Ocorreu um erro inesperado ao gerar o relatório de abastecimentos.",
    };
  }
};

export { handleExportFuel };
