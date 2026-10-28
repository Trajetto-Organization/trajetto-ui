import type { ImportSummary } from "@/actions/delivery/import-delivery-xml";
import { relayUrl } from "@/lib/api-relay-paths";

/** The answer the dialog reads, in the shape the Server Action returned. */
interface XmlImportAnswer {
  success: boolean;
  message: string;
  data?: ImportSummary;
}

/**
 * Sends the NF-e through the relay, with the API's own body
 * ({ files: [{ filename, content }], shipperId?, scheduled_date? }).
 *
 * It was a Server Action, and Next 14 caps an action's body at 1 MB: the
 * dialog takes 25 files of up to 512 KB, so an upload past ~750 KB never
 * reached the API. The relay's route handler streams it under the API's own
 * ceiling instead.
 */
async function sendXmlImport(
  businessId: string,
  files: Array<{ filename: string; content: string }>,
  options: { shipperId?: string; scheduled_date?: string } = {},
): Promise<XmlImportAnswer> {
  let response: Response;

  try {
    response = await fetch(
      relayUrl(`/delivery/import-xml/${encodeURIComponent(businessId)}`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files,
          ...(options.shipperId && { shipperId: options.shipperId }),
          ...(options.scheduled_date && {
            scheduled_date: options.scheduled_date,
          }),
        }),
        cache: "no-store",
      },
    );
  } catch {
    return {
      success: false,
      message:
        "Não foi possível enviar os arquivos. Confira a aba Importações antes de enviar de novo.",
    };
  }

  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
    data?: ImportSummary;
  } | null;

  const message =
    typeof body?.message === "string" && body.message ? body.message : null;

  if (!response.ok || !body?.data) {
    return {
      success: false,
      message: message ?? "Houve um erro ao importar os arquivos.",
    };
  }

  return {
    success: true,
    message: message ?? "Importação concluída.",
    data: body.data,
  };
}

export { sendXmlImport };
export type { XmlImportAnswer };
