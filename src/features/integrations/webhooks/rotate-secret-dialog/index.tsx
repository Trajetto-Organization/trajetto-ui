"use client";

import { useState } from "react";
import { toast } from "sonner";

import { KeyRound, Loader } from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import {
  rotateWebhookSecret,
  type WebhookEndpointRow,
} from "@/actions/integration";
import { isStaleActionResult } from "@/lib/action-result";

import {
  SecretReveal,
  useConfirmBeforeClosingSecret,
} from "../../components/secret-reveal";
import { DocsLink } from "../../components/docs-link";
import { INTEGRATION_DOCS } from "../../lib/docs-links";

interface RotateSecretDialogProps {
  businessId: string;
  endpoint: WebhookEndpointRow;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * A new signing secret for one endpoint, without losing events.
 *
 * Two steps in one dialog: first the consequence, then — once generated — the
 * secret, shown this one time. The grace period is what makes the button safe
 * to press, so it is said BEFORE: for 24 hours the old secret keeps signing
 * beside the new one, and the customer's system switches keys whenever it is
 * ready. Changing a leaked secret used to mean deleting the endpoint and its
 * whole delivery history.
 */
const RotateSecretDialog = ({
  businessId,
  endpoint,
  isOpen,
  onClose,
}: RotateSecretDialogProps): JSX.Element => {
  const [isRotating, setIsRotating] = useState<boolean>(false);

  /** Held in memory only, and only until this dialog closes. */
  const [secret, setSecret] = useState<string | null>(null);

  const handleRotate = async () => {
    setIsRotating(true);

    try {
      const result = await rotateWebhookSecret(businessId, endpoint.id);

      if (isStaleActionResult(result)) return;

      if (!result.success || !result.data?.secret) {
        toast.error(result.message);
        return;
      }

      setSecret(result.data.secret);
    } finally {
      setIsRotating(false);
    }
  };

  const handleClose = () => {
    setSecret(null);

    onClose();
  };

  const { handleOpenChange, guard, markCopied } = useConfirmBeforeClosingSecret(
    {
      isRevealing: Boolean(secret),
      onClose: handleClose,
      what: "o segredo",
    },
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !isRotating && handleOpenChange(open)}
    >
      <DialogScrollContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
            {secret ? "Novo segredo gerado" : "Gerar novo segredo"}
          </DialogTitle>

          <DialogDescription>
            {secret
              ? "Guarde o segredo agora. Esta é a única vez que ele aparece."
              : endpoint.name}
          </DialogDescription>
        </DialogHeader>

        {secret ? (
          <SecretReveal
            value={secret}
            label="o segredo"
            fieldLabel="Segredo de assinatura"
            successMessage="Segredo copiado."
            warning="O segredo anterior continua assinando junto por 24 horas. Troque o segredo no sistema que recebe os eventos dentro desse prazo; depois dele, só o novo assina."
            hint={
              <>
                Durante as 24 horas o cabeçalho{" "}
                <code>X-Trajetto-Signature</code> traz dois <code>v1</code>, um
                por segredo: aceite a chamada se qualquer um conferir. A chave
                do HMAC é o segredo inteiro, com o prefixo <code>whsec_</code>.{" "}
                <DocsLink href={INTEGRATION_DOCS.signature}>
                  Como verificar a assinatura
                </DocsLink>
              </>
            }
            doneLabel="Já guardei"
            onDone={handleClose}
            onCopied={markCopied}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Um segredo novo passa a assinar os eventos a partir de agora. O
              atual continua assinando junto por 24 horas, para que o sistema
              que recebe os eventos troque a chave sem perder nenhum. Use quando
              o segredo pode ter vazado ou quando a equipe que o conhecia mudou.
            </p>

            <DialogFormFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isRotating}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={handleRotate}
                disabled={isRotating}
              >
                {isRotating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Gerar novo segredo
              </Button>
            </DialogFormFooter>
          </div>
        )}
      </DialogScrollContent>

      {guard}
    </Dialog>
  );
};

export { RotateSecretDialog };
