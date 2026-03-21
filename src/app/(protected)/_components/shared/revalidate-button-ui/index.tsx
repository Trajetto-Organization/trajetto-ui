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

  return (
    <Button
      type={type}
      variant="outline"
      size={size}
      disabled={isDisabled}
      className={className}
      onClick={onClick}
      data-revalidate
    >
      {!isMounted ? (
        <span>{label}</span>
      ) : isRateLimited ? (
        <>
          Aguarde {displayCooldown}s
          <Clock className="ml-2 h-4 w-4" />
        </>
      ) : alwaysShowIcon ? (
        <>
          <RefreshCw
            className={cn(
              "h-4 w-4 mr-2 flex-shrink-0",
              isLoading && "animate-spin",
            )}
          />
          <span>{label}</span>
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
