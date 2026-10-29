import type { ChatSendSummary } from "@/actions/chat/chat.types";

/**
 * The toast after a mass notice, told from what the API says happened to
 * each recipient (decision 6.8).
 *
 * The old toast counted the drivers the dialog had selected, so a driver
 * with no app account was "enviado" while the message sat in a thread
 * nobody reads.
 */
interface BroadcastToast {
  tone: "success" | "warning" | "error";
  message: string;
}

const drivers = (count: number): string =>
  `${count} motorista${count === 1 ? "" : "s"}`;

function describeBroadcastOutcome(
  summary: ChatSendSummary | null,
  /** Messages the API answered, for an API that sends no summary. */
  fallbackReached: number,
): BroadcastToast {
  if (!summary) {
    return {
      tone: "success",
      message: `Aviso enviado para ${drivers(fallbackReached)}.`,
    };
  }

  const { sent, alreadySent, skippedNoApp } = summary;

  if (sent + alreadySent === 0) {
    return {
      tone: "error",
      message:
        skippedNoApp > 0
          ? "Ninguém recebeu o aviso: os motoristas escolhidos não têm o aplicativo."
          : "Ninguém recebeu o aviso.",
    };
  }

  const parts: string[] = [];

  if (sent > 0) parts.push(`Aviso enviado para ${drivers(sent)}.`);

  if (alreadySent > 0) {
    parts.push(
      alreadySent === 1
        ? "1 motorista já tinha recebido este aviso."
        : `${alreadySent} motoristas já tinham recebido este aviso.`,
    );
  }

  if (skippedNoApp > 0) {
    parts.push(
      skippedNoApp === 1
        ? "1 motorista sem o aplicativo ficou de fora."
        : `${skippedNoApp} motoristas sem o aplicativo ficaram de fora.`,
    );
  }

  return {
    tone: skippedNoApp > 0 ? "warning" : "success",
    message: parts.join(" "),
  };
}

export { describeBroadcastOutcome };
export type { BroadcastToast };
