"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** How long the check mark stays before the button offers to copy again. */
const COPIED_RESET_MS = 2000;

/**
 * "Copied" as a moment, not a state the button is stuck in.
 *
 * The three secret dialogs (new API key, new webhook, rotated secret) set
 * `copied` and never cleared it: the check mark stayed forever, so a second
 * copy — the one after the clipboard got overwritten — gave no feedback at
 * all. Each press re-arms the timer; unmounting clears it.
 */
function useCopyFeedback(resetAfterMs: number = COPIED_RESET_MS): {
  copied: boolean;
  markCopied: () => void;
} {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const markCopied = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);

    setCopied(true);

    timer.current = setTimeout(() => {
      setCopied(false);
      timer.current = null;
    }, resetAfterMs);
  }, [resetAfterMs]);

  return { copied, markCopied };
}

interface CopyFieldProps {
  /** The text shown and copied. */
  value: string;

  /**
   * What it is, completing the button's name "Copiar …": `"o segredo"`,
   * `"a chave"`.
   */
  label: string;

  /** Toast on success; the button's own check mark is always shown. */
  successMessage?: string;

  resetAfterMs?: number;
  className?: string;

  /**
   * Called after each successful copy, never after a refused one. The
   * one-time secret dialogs use it to stop asking "Fechar sem guardar?".
   */
  onCopied?: () => void;
}

/**
 * A value to copy, with its button.
 *
 * `items-stretch` and a button that follows the value's height: a secret
 * wraps onto two lines in a narrow dialog, and the fixed 40px icon button sat
 * centred beside a taller box — two controls of different heights for one
 * thing.
 */
const CopyField = ({
  value,
  label,
  successMessage = "Copiado.",
  resetAfterMs = COPIED_RESET_MS,
  className,
  onCopied,
}: CopyFieldProps): JSX.Element => {
  const { copied, markCopied } = useCopyFeedback(resetAfterMs);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);

      markCopied();
      toast.success(successMessage);
      onCopied?.();
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie à mão.");
    }
  };

  return (
    <div data-copy-field className={cn("flex items-stretch gap-2", className)}>
      <code
        className="flex min-h-10 min-w-0 flex-1 items-center break-all
        rounded-md border bg-muted px-3 py-2 font-mono text-xs"
      >
        {value}
      </code>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-auto min-h-10 w-10 shrink-0 self-stretch"
        onClick={() => void handleCopy()}
        aria-label={copied ? "Copiado" : `Copiar ${label}`}
        data-copied={copied ? "" : undefined}
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>

      {/* Announced once per copy; the button's name alone changes silently. */}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copiado" : ""}
      </span>
    </div>
  );
};

export { CopyField, useCopyFeedback, COPIED_RESET_MS };
