"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** The toasts' landmark; sonner appends the hotkey ("Notificações alt+T"). */
const TOASTER_ARIA_LABEL = "Notificações";

const CLOSE_TOAST_ARIA_LABEL = "Fechar notificação";

function relabelCloseButtons(region: HTMLElement): void {
  region
    .querySelectorAll<HTMLButtonElement>("button[data-close-button]")
    .forEach((button) => {
      // Guarded, so the observer's own write does not trigger another pass.
      if (button.getAttribute("aria-label") !== CLOSE_TOAST_ARIA_LABEL) {
        button.setAttribute("aria-label", CLOSE_TOAST_ARIA_LABEL);
      }
    });
}

/**
 * The X of a toast is named "Close toast" by sonner 1.7, and its Toaster
 * does not hand `closeButtonAriaLabel` down to the toasts (only the internal
 * Toast reads it). The realtime notification toasts show that X, so it is
 * renamed here, once for every toast, as each one mounts.
 */
function useLocalizedCloseButtons(regionRef: RefObject<HTMLElement>): void {
  useEffect(() => {
    const region = regionRef.current;

    if (!region) return;

    relabelCloseButtons(region);

    const observer = new MutationObserver(() => relabelCloseButtons(region));

    observer.observe(region, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-label"],
    });

    return () => observer.disconnect();
  }, [regionRef]);
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const regionRef = useRef<HTMLElement>(null);

  useLocalizedCloseButtons(regionRef);

  return (
    <Sonner
      ref={regionRef}
      theme={theme as ToasterProps["theme"]}
      containerAriaLabel={TOASTER_ARIA_LABEL}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
