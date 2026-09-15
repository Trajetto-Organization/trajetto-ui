"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ExternalLink, FileText, Loader, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  getProofDocument,
  type ProofDocumentData,
} from "@/actions/delivery/get-proof-document";

import type { DeliveryStatus } from "@/actions/delivery/get-delivery";

interface ProofDocumentSectionProps {
  businessId: string;
  deliveryId: string;
  status: DeliveryStatus;
}

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
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Código de integridade:{" "}
              <span className="break-all font-mono">{document.sha256}</span>
            </p>

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

export { ProofDocumentSection, SETTLED };
