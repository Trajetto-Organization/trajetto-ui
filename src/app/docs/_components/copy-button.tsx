"use client";

import { useEffect, useRef, useState } from "react";

import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  /** What is copied, for the screen reader: "Copiar código curl". */
  label: string;
  className?: string;
}

/** How long the "Copiado" state stays before the button resets. */
const COPIED_MS = 2_000;

/**
 * Copies a code sample. The clipboard API needs a secure context; where it is
 * missing or refused, the button says so instead of pretending it worked.
 */
const CopyButton = ({ text, label, className }: CopyButtonProps) => {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    clearTimeout(timer.current);

    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }

    timer.current = setTimeout(() => setState("idle"), COPIED_MS);
  };

  return (
    <button
      type="button"
      onClick={copy}
      // Starts with the visible word, so voice control finds it (WCAG 2.5.3).
      aria-label={label}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-site-muted transition-colors hover:bg-site-soft2 hover:text-site-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40",
        className,
      )}
    >
      {state === "copied" ? (
        <Check
          className="size-3.5 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      <span aria-hidden>
        {state === "copied"
          ? "Copiado"
          : state === "failed"
            ? "Não foi possível copiar"
            : "Copiar"}
      </span>
      <span className="sr-only" aria-live="polite">
        {state === "copied"
          ? "Código copiado."
          : state === "failed"
            ? "Não foi possível copiar."
            : ""}
      </span>
    </button>
  );
};

export { CopyButton };
