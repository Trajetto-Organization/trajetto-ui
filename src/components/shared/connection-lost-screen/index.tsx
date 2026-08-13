"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, WifiOff } from "lucide-react";

import { forceLogout } from "@/lib/force-logout";

interface ConnectionLostScreenProps {
  onRetry: () => void;
  isRetrying: boolean;

  // Seconds until the next automatic attempt. Null while one is in flight.
  secondsUntilRetry: number | null;
}

/**
 * The blocking state shown while the API is unreachable.
 *
 * This is the answer to a dashboard that had quietly stopped working: the
 * complaint was never that the user still had access — they had none, since
 * every action goes through the API — it was that nothing on screen said so.
 *
 * The session is deliberately kept. A backend that cannot answer has not said
 * this session is invalid, and throwing it away would mean a deploy logs out
 * every driver in the field, several of whom do not know their own password
 * because an administrator set it up for them. When the API answers again the
 * user carries on from where they were; if the answer is that they were
 * revoked, they are kicked then, with certainty instead of a guess.
 *
 * "Sair" is here for the case where waiting is not what the user wants. It
 * cannot call the API — that is the whole problem — so it clears the session
 * locally and lands on the login page.
 */
const ConnectionLostScreen = ({
  onRetry,
  isRetrying,
  secondsUntilRetry,
}: ConnectionLostScreenProps): JSX.Element => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-[100] flex items-center justify-center 
      bg-background/85 backdrop-blur-sm animate-fade-in [animation-duration:140ms]"
    >
      <div
        className="mx-4 flex max-w-md flex-col items-center gap-5 
        rounded-xl border bg-card px-8 py-10 text-center shadow-lg"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <WifiOff className="size-5 text-muted-foreground" aria-hidden />
        </span>

        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Sem conexão com o servidor
          </h2>
          <p className="text-sm text-muted-foreground">
            Não foi possível falar com o sistema. Seus dados e sua sessão estão
            preservados — assim que a conexão voltar, você continua de onde
            parou.
          </p>
        </div>

        <p className="text-xs text-muted-foreground" aria-live="polite">
          {isRetrying
            ? "Tentando reconectar…"
            : secondsUntilRetry !== null
              ? `Nova tentativa em ${secondsUntilRetry}s`
              : "Aguardando nova tentativa…"}
        </p>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={onRetry} disabled={isRetrying} className="sm:w-auto">
            <RefreshCw
              className={`mr-2 size-4 ${isRetrying ? "animate-spin" : ""}`}
              aria-hidden
            />
            Tentar agora
          </Button>

          <Button
            variant="outline"
            onClick={() => forceLogout("service_unavailable")}
            className="sm:w-auto"
          >
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
};

export { ConnectionLostScreen };
