"use client";

import { useEffect, useState } from "react";
import Turnstile from "react-turnstile";

interface CaptchaTurnstileProps {
  sitekey: string;
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

  useEffect(() => {
    const timer = setTimeout(() => setShouldMount(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <>
      {shouldMount && (
        <Turnstile
          key={resetSignal}
          sitekey={sitekey}
          onSuccess={onSuccess}
          theme={theme}
          size={size}
          className={`mt-5 ${className ?? ""}`}
        />
      )}
    </>
  );
};

export { CaptchaTurnstile };
