"use client";

import { useEffect, useState } from "react";
import Turnstile from "react-turnstile";

import { usePublicConfig } from "@/env/use-public-config";

/** Cloudflare's widget heights: what the box keeps free before it mounts. */
const WIDGET_HEIGHT_PX = { normal: 65, flexible: 65, compact: 140 } as const;

interface CaptchaTurnstileProps {
  /** Defaults to the site key of the running environment (TURNSTILE_SITE_KEY). */
  sitekey?: string;
  onSuccess: (token: string) => void;
  resetSignal?: number;
  delayMs?: number;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "compact" | "flexible";
  className?: string;
}

const CaptchaTurnstile = ({
  sitekey,
  onSuccess,
  resetSignal,
  delayMs = 500,
  theme = "auto",
  size = "normal",
  className,
}: CaptchaTurnstileProps): JSX.Element => {
  const [shouldMount, setShouldMount] = useState<boolean>(false);

  // Read at run time (src/env), not inlined at build: the image is promoted
  // from staging to production with production's key.
  const publicConfig = usePublicConfig();
  const resolvedSitekey = sitekey ?? publicConfig?.turnstileSiteKey ?? null;

  useEffect(() => {
    const timer = setTimeout(() => setShouldMount(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  // The box is in the server markup with the widget's height, so the iframe
  // that mounts later fills space already there instead of pushing the form
  // down (a 0.10 layout shift on /login).
  return (
    <div
      className={`mt-5 ${className ?? ""}`}
      style={{ minHeight: WIDGET_HEIGHT_PX[size] }}
    >
      {shouldMount && resolvedSitekey && (
        <Turnstile
          key={resetSignal}
          sitekey={resolvedSitekey}
          onSuccess={onSuccess}
          theme={theme}
          size={size}
        />
      )}
    </div>
  );
};

export { CaptchaTurnstile };
