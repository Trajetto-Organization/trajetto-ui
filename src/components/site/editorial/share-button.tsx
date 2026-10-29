"use client";

import { useEffect, useState } from "react";

import { Check, Link as LinkIcon } from "lucide-react";

type Feedback = "idle" | "copied" | "failed";

interface ShareButtonProps {
  title: string;
  description: string;
}

/**
 * "Copiar link" (the design): the native share sheet on phones, the
 * clipboard elsewhere. A cancelled share is not an error; a refused
 * clipboard says so instead of failing silently.
 */
const ShareButton = ({ title, description }: ShareButtonProps) => {
  const [feedback, setFeedback] = useState<Feedback>("idle");

  useEffect(() => {
    if (feedback === "idle") return;

    const timeout = setTimeout(() => setFeedback("idle"), 1800);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const share = async () => {
    const url = window.location.href.split("#")[0];

    // The sheet only on narrow screens, as the design: on a desktop the
    // button promises a copied link.
    if (typeof navigator.share === "function" && window.innerWidth < 760) {
      try {
        await navigator.share({ title, text: description, url });
        return;
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setFeedback("copied");
    } catch {
      setFeedback("failed");
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex min-h-[38px] items-center gap-[7px] whitespace-nowrap rounded-[10px] border border-site-line2 bg-transparent px-[13px] py-2 text-[13.5px] font-medium text-site-ink outline-none transition-colors hover:bg-site-surface focus-visible:ring-2 focus-visible:ring-site-ink/40"
    >
      {feedback === "copied" ? (
        <Check
          aria-hidden
          className="size-[15px] animate-tp-pop text-[#10b981]"
          strokeWidth={2.6}
        />
      ) : (
        <LinkIcon aria-hidden className="size-[15px]" />
      )}
      <span aria-live="polite">
        {feedback === "copied"
          ? "Link copiado"
          : feedback === "failed"
            ? "Não foi possível copiar"
            : "Copiar link"}
      </span>
    </button>
  );
};

export { ShareButton };
