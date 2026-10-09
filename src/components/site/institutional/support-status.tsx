"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { supportStatus, type SupportStatus } from "./support-hours";

/**
 * Whether support is open right now. `null` on the server and on the first
 * client render: the pages are prerendered, and the build's clock must not
 * end up in their HTML (nor cause a hydration mismatch).
 */
function useSupportStatus(): SupportStatus | null {
  const [status, setStatus] = useState<SupportStatus | null>(null);

  useEffect(() => {
    const tick = () => setStatus(supportStatus(new Date()));
    tick();
    const timer = setInterval(tick, 60_000);

    return () => clearInterval(timer);
  }, []);

  return status;
}

/** Contact hero pill: "Atendimento aberto agora · até 18:00". */
const SupportStatusPill = ({
  className,
}: {
  className?: string;
}): JSX.Element => {
  const status = useSupportStatus();
  const open = status?.open ?? false;

  const label = !status
    ? "Atendimento de segunda a sexta"
    : open
      ? "Atendimento aberto agora"
      : "Fora do horário";
  const hint = !status
    ? "· 09:00 às 18:00"
    : open
      ? "· até 18:00"
      : `· voltamos ${status.reopens} às 09:00`;

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2.5 self-start rounded-full border border-site-line2 bg-site-surface py-[7px] pl-3 pr-3.5 text-[13px] font-medium",
        className,
      )}
    >
      <span aria-hidden className="relative flex size-2 shrink-0">
        {open ? (
          <span className="absolute inset-0 animate-tp-live rounded-full bg-emerald-500" />
        ) : null}
        <span
          className={cn(
            "relative size-2 rounded-full",
            open ? "bg-emerald-500" : "bg-site-muted",
          )}
        />
      </span>
      <span className="min-w-0 truncate">
        {label} <span className="text-site-muted">{hint}</span>
      </span>
    </div>
  );
};

/** The dark "Suporte Dedicado" card on /about: a dot and a short line. */
const SupportStatusLine = (): JSX.Element => {
  const status = useSupportStatus();
  const open = status?.open ?? false;
  const label = !status
    ? "Seg–Sex, horário de Brasília"
    : open
      ? "Atendimento aberto agora"
      : "Fora do horário agora";

  return (
    <p
      className={cn(
        "m-0 mt-0.5 flex items-center gap-1.5 text-xs",
        open ? "text-[#34d399]" : "text-[#9d9fab]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          open ? "bg-[#34d399]" : "bg-[#9d9fab]",
        )}
      />
      {label}
    </p>
  );
};

export { SupportStatusLine, SupportStatusPill, useSupportStatus };
