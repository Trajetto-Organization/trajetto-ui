"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogFormFooter } from "@/components/ui/dialog";

import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";
import { CopyField } from "@/components/shared/custom/copy-field";

interface SecretRevealProps {
  /** The value shown this one time. */
  value: string;

  /** What it is, for the field and the copy button: "a chave", "o segredo". */
  label: string;
  fieldLabel: string;
  successMessage: string;

  /** Why it matters that it is copied now. */
  warning: ReactNode;

  /** How to use it, under the value. */
  hint?: ReactNode;

  /** "Já copiei" / "Já guardei": the explicit way out. */
  doneLabel: string;
  onDone: () => void;

  /**
   * After each successful copy. The dialog wires the close guard's
   * `markCopied` here, so ESC and the X stop asking once the value is kept:
   * the dialog owns both the guard and the reveal, so the fact lives in the
   * guard's own state.
   */
  onCopied?: () => void;
}

/**
 * A credential shown once: the key of a new integration, a webhook's signing
 * secret. The three dialogs each had their own copy block, whose check mark
 * never reset and whose button was shorter than the value beside it
 * (DLVB-23); CopyField fixes both, here once for the three.
 */
const SecretReveal = ({
  value,
  label,
  fieldLabel,
  successMessage,
  warning,
  hint,
  doneLabel,
  onDone,
  onCopied,
}: SecretRevealProps): JSX.Element => {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
          aria-hidden="true"
        />

        <p className="text-sm text-amber-900 dark:text-amber-200">{warning}</p>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium leading-none">{fieldLabel}</p>

        <CopyField
          value={value}
          label={label}
          successMessage={successMessage}
          onCopied={onCopied}
        />

        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>

      <DialogFormFooter>
        <Button type="button" onClick={onDone}>
          {doneLabel}
        </Button>
      </DialogFormFooter>
    </div>
  );
};

/**
 * ESC and the X close a dialog (decision 3.2) — but on a value shown once,
 * closing by reflex loses it for good: the only way back is issuing another.
 * While the value is on screen and not yet copied, those two gestures ask
 * first. After a successful copy they close at once: asking "Fechar sem
 * guardar?" then accused the person of something they had just done. The
 * dialog's own "Já copiei" always closes at once, because pressing it IS the
 * answer.
 *
 * `markCopied` goes to the reveal's `onCopied`. It holds for the value on
 * screen: a new value only appears after the reveal was left (`isRevealing`
 * false — the three dialogs clear it on close), which forgets the copy.
 */
function useConfirmBeforeClosingSecret({
  isRevealing,
  onClose,
  what,
}: {
  isRevealing: boolean;
  onClose: () => void;
  /** "a chave", "o segredo". */
  what: string;
}) {
  const [asking, setAsking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isRevealing) setCopied(false);
  }, [isRevealing]);

  const markCopied = useCallback(() => setCopied(true), []);

  const handleOpenChange = (open: boolean) => {
    if (open) return;

    if (isRevealing && !copied) {
      setAsking(true);
      return;
    }

    onClose();
  };

  const guard = (
    <ConfirmDialog
      open={asking}
      onOpenChange={setAsking}
      title="Fechar sem guardar?"
      description={
        <p>
          Esta é a única vez que {what} aparece. Se ainda não copiou, volte e
          copie antes de fechar: depois disso, o caminho é gerar outro.
        </p>
      }
      cancelLabel="Voltar e copiar"
      confirmLabel="Fechar mesmo assim"
      destructive
      onConfirm={() => {
        setAsking(false);
        onClose();
      }}
    />
  );

  return { handleOpenChange, guard, isAsking: asking, markCopied };
}

export { SecretReveal, useConfirmBeforeClosingSecret };
