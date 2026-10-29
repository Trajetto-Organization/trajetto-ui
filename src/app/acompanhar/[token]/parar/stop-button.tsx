"use client";

import { useState } from "react";
import { BellOff, Check, Loader } from "lucide-react";

import { stopDeliveryMessages } from "./action";

/**
 * The POST, and only on a real click.
 *
 * WhatsApp, e-mail clients and chat apps prefetch links to build previews. A
 * page that unsubscribed on load would stop messages the person never asked to
 * stop — and they would only find out by not hearing about their next
 * delivery.
 */
const StopMessagesButton = ({ token }: { token: string }): JSX.Element => {
  const [state, setState] = useState<
    "idle" | "pending" | "done" | "unreachable"
  >("idle");

  if (state === "done") {
    return (
      <p
        className="flex items-center justify-center gap-2 text-sm font-medium
        text-emerald-700 dark:text-emerald-400"
        role="status"
      >
        <Check className="h-4 w-4" />
        Pronto. Você não receberá mais mensagens sobre esta entrega.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {state === "unreachable" && (
        <p className="text-sm text-destructive" role="alert">
          Não conseguimos falar com o servidor. Tente novamente.
        </p>
      )}

      {/* The app's pending pattern (decision 16.64): disabled, spinning,
          saying what it is doing and aria-busy until the answer arrives. */}
      <button
        type="button"
        disabled={state === "pending"}
        aria-busy={state === "pending" || undefined}
        onClick={async () => {
          setState("pending");

          // The API answers the same sentence for a real token and an invented
          // one, so there is no oracle in surfacing a network failure — it
          // happens identically for both, and the person whose request never
          // landed is the one who genuinely has to try again.
          const reached = await stopDeliveryMessages(token);

          setState(reached ? "done" : "unreachable");
        }}
        className="inline-flex w-full items-center justify-center gap-2
        rounded-lg border px-4 py-3 text-sm font-medium
        hover:bg-muted disabled:opacity-60"
      >
        {state === "pending" ? (
          <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <BellOff className="h-4 w-4" aria-hidden="true" />
        )}
        {state === "pending" ? "Parando…" : "Parar mensagens"}
      </button>
    </div>
  );
};

export { StopMessagesButton };
