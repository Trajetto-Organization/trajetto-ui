"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

import { Clock, Loader, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevalidateButtonUIProps {
  isLoading: boolean;
  isRateLimited: boolean;
  cooldownRemaining: number;
  /** Text displayed on the button. Defaults to "Atualizar". */
  label?: string;
  className?: string;
  /**
   * true  → RefreshCw icon always visible, spins when loading (default)
   * false → no icon in normal state, Loader spinner only when loading
   */
  alwaysShowIcon?: boolean;
  /**
   * Below `sm`, the button keeps the icon and drops the words.
   *
   * On a phone an actions bar of four full-width buttons pushes the content
   * off the first screen — "Revalidar Dados" is fourteen characters of a
   * control the user already recognises by its arrows. The accessible name
   * stays, so nothing is lost to a screen reader, and the cooldown still
   * shows its seconds, because that number IS the feedback.
   */
  hideLabelOnMobile?: boolean;
  type?: "button" | "submit";
  size?: "default" | "sm";
  onClick?: () => void;
}

const RevalidateButtonUI = ({
  isLoading,
  isRateLimited,
  cooldownRemaining,
  label = "Atualizar",
  className,
  alwaysShowIcon = true,
  hideLabelOnMobile = false,
  type = "button",
  size = "sm",
  onClick,
}: RevalidateButtonUIProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDisabled = isLoading || isRateLimited;
  const displayCooldown =
    isRateLimited && cooldownRemaining <= 0 ? 1 : cooldownRemaining;

  // Hiding the words only works if the icon takes their place; otherwise the
  // phone gets an empty box.
  const showIcon = alwaysShowIcon || hideLabelOnMobile;

  const wordsClass = hideLabelOnMobile ? "hidden sm:inline" : undefined;

  return (
    <Button
      type={type}
      variant="outline"
      size={size}
      disabled={isDisabled}
      className={className}
      // The name survives the label being hidden.
      aria-label={hideLabelOnMobile ? label : undefined}
      onClick={onClick}
      data-revalidate
    >
      {!isMounted ? (
        <span className={wordsClass}>{label}</span>
      ) : isRateLimited ? (
        <>
          <span className={wordsClass}>Aguarde </span>
          {displayCooldown}s
          <Clock className="ml-2 h-4 w-4" />
        </>
      ) : showIcon ? (
        <>
          <RefreshCw
            className={cn(
              "h-4 w-4 flex-shrink-0",
              hideLabelOnMobile ? "sm:mr-2" : "mr-2",
              isLoading && "animate-spin",
            )}
          />
          <span className={wordsClass}>{label}</span>
        </>
      ) : (
        <>
          {label}
          {isLoading && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </>
      )}
    </Button>
  );
};

/**
 * Thin wrapper that reads `pending` from useFormStatus().
 * Must be rendered as a direct child of a <form> element.
 */
const RevalidateButtonFormInner = (
  props: Omit<RevalidateButtonUIProps, "isLoading" | "type">,
) => {
  const { pending } = useFormStatus();

  return <RevalidateButtonUI {...props} isLoading={pending} type="submit" />;
};

export { RevalidateButtonUI, RevalidateButtonFormInner };
export type { RevalidateButtonUIProps };
