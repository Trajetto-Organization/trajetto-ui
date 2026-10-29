"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  ExternalLink,
  FileText,
  Loader,
  QrCode,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  getProofDocument,
  type ProofDocumentData,
} from "@/actions/delivery/get-proof-document";

import type { DeliveryStatus } from "@/actions/delivery/get-delivery";
import { isStaleActionResult } from "@/lib/action-result";

import {
  ITI_VALIDATOR_URL,
  proofRegenerateHint,
  proofSignatureBadge,
} from "./signature";

interface ProofDocumentSectionProps {
  businessId: string;
  deliveryId: string;
  status: DeliveryStatus;

  /**
   * Regenerating rewrites a document already handed out, and the API takes
   * it as a write (403 PERMISSION_DENIED for a read-only profile). Without
   * it the button stays on screen, disabled, with the reason (decision 4.2).
   */
  canRegenerate?: boolean;

  /** Why it is disabled; the profile's own tooltip message when known. */
  regenerateBlockedReason?: string;
}

const READ_ONLY_REASON =
  "Seu perfil de acesso permite apenas a leitura desta seção.";

/**
 * The receipt, fetched when somebody asks for it.
 *
 * Not loaded with the dialog, and that is the point: the API generates the PDF
 * on the first request, and most deliveries never have theirs opened. Rendering
 * one every time a dispatcher glances at a delivery would put that work — and
 * a bucket write — behind a screen people open all day.
 *
 * The first press takes a moment because it is really building the document.
 * The button says so, because a button that looks broken for two seconds is a
 * button people press twice.
 */
const SETTLED: DeliveryStatus[] = ["DELIVERED", "FAILED"];

const ProofDocumentSection = ({
  businessId,
  deliveryId,
  status,
  canRegenerate = true,
  regenerateBlockedReason,
}: ProofDocumentSectionProps): JSX.Element | null => {
  const [document, setDocument] = useState<ProofDocumentData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // A receipt for a delivery still in the street would assert something that
  // has not happened. The API refuses it too; this is the same refusal made
  // before the click.
  if (!SETTLED.includes(status)) return null;

  const handleFetch = async (regenerate = false) => {
    setIsLoading(true);

    try {
      const result = await getProofDocument(businessId, deliveryId, regenerate);

      if (isStaleActionResult(result)) return;

      if (!result.success || !result.data) {
        toast.error(result.message);
        return;
      }

      setDocument(result.data);

      if (regenerate) toast.success("Comprovante gerado novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Comprovante</p>

      {document ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border
              px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <FileText className="h-4 w-4" />
              Abrir PDF
            </a>

            <a
              href={document.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border
              px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <QrCode className="h-4 w-4" />
              Página de verificação
              <ExternalLink className="h-3 w-3" />
            </a>

            <SignatureBadge document={document} />

            {canRegenerate ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isLoading}
                onClick={() => void handleFetch(true)}
              >
                {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Gerar novamente
              </Button>
            ) : (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* A disabled button takes no pointer or focus events, so
                        the reason hangs on this wrapper, which does. */}
                    <span
                      className="inline-flex"
                      tabIndex={0}
                      data-blocked-reason={
                        regenerateBlockedReason || READ_ONLY_REASON
                      }
                    >
                      <Button type="button" variant="ghost" size="sm" disabled>
                        Gerar novamente
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p>{regenerateBlockedReason || READ_ONLY_REASON}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Código de integridade:{" "}
              <span className="break-all font-mono">{document.sha256}</span>
            </p>

            {proofSignatureBadge(document).signed && (
              <p>
                Para validade jurídica, envie o PDF em{" "}
                <a
                  href={ITI_VALIDATOR_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground"
                >
                  validar.iti.gov.br
                  <ExternalLink className="h-3 w-3" />
                </a>
                .
              </p>
            )}

            {proofRegenerateHint(document) && (
              <p className="text-amber-800 dark:text-amber-300">
                {proofRegenerateHint(document)}
              </p>
            )}

            {document.version > 1 && (
              <p>
                {document.version}ª versão — uma cópia impressa anterior ainda
                chega à página de verificação, mas não é a atual.
              </p>
            )}
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => void handleFetch()}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Gerando o comprovante...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Ver comprovante
            </>
          )}
        </Button>
      )}
    </div>
  );
};

/**
 * "Assinado digitalmente (ICP-Brasil)" or "Sem assinatura digital", with who
 * signed or why not in the tooltip (design §9.1). Focusable, so the reason
 * reaches the keyboard too.
 */
const SignatureBadge = ({
  document,
}: {
  document: ProofDocumentData;
}): JSX.Element => {
  const badge = proofSignatureBadge(document);
  const Icon = badge.signed ? ShieldCheck : ShieldAlert;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            data-signature-status={badge.signed ? "SIGNED" : "UNSIGNED"}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5
            text-xs font-medium focus:outline-none focus-visible:ring-2
            focus-visible:ring-ring ${
              badge.signed
                ? "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
                : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {badge.label}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p>{badge.reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export { ProofDocumentSection, SETTLED };
