"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one face of every refresh in the logged-in app (decision 16.450,
 * 08/10/2026): "Atualizar" with the arrows, which spin while the refresh
 * runs. The tables used to say "Revalidar Dados" with no icon and a separate
 * spinner, the Kanban and the overviews "Atualizar" with spinning arrows —
 * two looks for the same gesture.
 */
interface RevalidateButtonUIProps {
  isLoading: boolean;
  isRateLimited: boolean;
  cooldownRemaining: number;
  /** Text displayed on the button. Defaults to "Atualizar". */
  label?: string;
  className?: string;
  /**
   * Below `sm`, the button keeps the icon and drops the words.
   *
   * On a phone an actions bar of four full-width buttons pushes the content
   * off the first screen. The accessible name stays, so nothing is lost to a
   * screen reader, and the cooldown still shows its seconds, because that
   * number IS the feedback.
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
  hideLabelOnMobile = false,
  type = "button",
  size = "sm",
  onClick,
}: RevalidateButtonUIProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // The cooldown lives in localStorage, so it is only known after mount;
  // before that the idle face is drawn, icon included, so nothing shifts.
  const showCooldown = isMounted && isRateLimited;
  const isDisabled = isLoading || isRateLimited;
  const displayCooldown =
    isRateLimited && cooldownRemaining <= 0 ? 1 : cooldownRemaining;

  const wordsClass = hideLabelOnMobile ? "hidden sm:inline" : undefined;

  return (
    <Button
      type={type}
      variant="outline"
      size={size}
      disabled={isDisabled}
      aria-busy={isLoading}
      className={className}
      // The name survives the words being hidden.
      aria-label={hideLabelOnMobile ? label : undefined}
      onClick={onClick}
      data-revalidate
      data-tutorial="revalidate"
    >
      {showCooldown ? (
        <>
          <span className={wordsClass}>Aguarde </span>
          {displayCooldown}s
          <Clock aria-hidden="true" className="h-4 w-4" />
        </>
      ) : (
        <>
          <RefreshCw
            aria-hidden="true"
            data-revalidate-icon
            className={cn("h-4 w-4 flex-shrink-0", isLoading && "animate-spin")}
          />
          <span className={wordsClass}>{label}</span>
        </>
      )}
    </Button>
  );
};

export { RevalidateButtonUI };
export type { RevalidateButtonUIProps };
