import type { Metadata } from "next";

import { BellOff, CheckCircle2 } from "lucide-react";

import { StopMessagesButton } from "./stop-button";

/**
 * NEVER indexed — the URL carries the tracking token.
 */
export const metadata: Metadata = {
  title: "Parar mensagens",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * Asking to be left alone, in one click and with no account.
 *
 * A confirmation step rather than acting on the GET, and that is deliberate:
 * WhatsApp, e-mail clients and chat apps PREFETCH links to build previews, and
 * a page that unsubscribed on load would quietly stop messages the person
 * never asked to stop. The button is a POST, which no preview fetches.
 */
const StopMessagesPage = ({
  params,
}: {
  params: { token: string };
}): JSX.Element => (
  <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-12">
    <div className="rounded-xl border p-6 text-center">
      <BellOff className="mx-auto h-10 w-10 text-muted-foreground" />

      <h1 className="mt-4 text-xl font-semibold">Parar de receber mensagens</h1>

      <p className="mt-2 text-sm text-muted-foreground">
        Você deixará de receber avisos sobre esta entrega. O acompanhamento
        continua disponível pelo link que você já tem.
      </p>

      <div className="mt-6">
        <StopMessagesButton token={params.token} />
      </div>
    </div>

    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Você pode voltar a receber pedindo à transportadora.
    </p>
  </main>
);

export default StopMessagesPage;
