import type { Metadata } from "next";

import {
  CheckCircle2,
  CircleDot,
  FileWarning,
  MapPin,
  PackageCheck,
  Truck,
} from "lucide-react";

import { trackDelivery } from "@/lib/public-api";

/**
 * NEVER indexed, and this is not a preference.
 *
 * The URL carries the tracking token, and it gets forwarded in family groups
 * and pasted into chats. A crawler that reached this page would put somebody's
 * delivery into a search engine, permanently.
 */
export const metadata: Metadata = {
  title: "Acompanhar entrega",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  PENDING: "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40",
  IN_TRANSIT: "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30",
  DELIVERED:
    "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
  FAILED: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
  CANCELLED:
    "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40",
};

function formatMoment(value: string | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const TrackDeliveryPage = async ({
  params,
}: {
  params: { token: string };
}): Promise<JSX.Element> => {
  const result = await trackDelivery(params.token);

  if (!result.ok || !result.data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4 py-12">
        <div className="rounded-xl border p-6 text-center">
          <FileWarning className="mx-auto h-10 w-10 text-muted-foreground" />

          <h1 className="mt-4 text-xl font-semibold">
            Acompanhamento não encontrado
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Este link não corresponde a nenhuma entrega. Se ele foi enviado há
            muito tempo, pode ter expirado — procure a transportadora.
          </p>
        </div>
      </main>
    );
  }

  const delivery = result.data;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-12">
      <header className="text-center">
        <p className="text-sm text-muted-foreground">{delivery.carrierName}</p>
        <h1 className="mt-1 text-2xl font-semibold">Sua entrega</h1>
      </header>

      <section
        className={`rounded-xl border p-5 text-center ${
          STATUS_TONE[delivery.status] ?? STATUS_TONE.PENDING
        }`}
        aria-live="polite"
      >
        {delivery.status === "DELIVERED" ? (
          <PackageCheck className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Truck className="mx-auto h-10 w-10 text-sky-600 dark:text-sky-400" />
        )}

        <h2 className="mt-3 text-lg font-semibold">{delivery.statusLabel}</h2>

        {delivery.status === "DELIVERED" ? (
          <p className="mt-2 text-sm">
            Entregue em {formatMoment(delivery.deliveredAt)}
            {delivery.receivedBy ? ` para ${delivery.receivedBy}` : ""}.
          </p>
        ) : (
          delivery.scheduledDate && (
            <p className="mt-2 text-sm">
              Previsão: {formatMoment(delivery.scheduledDate)}
            </p>
          )
        )}
      </section>

      <section className="rounded-xl border p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Destinatário</dt>
            <dd className="text-sm font-medium break-words">
              {delivery.recipientName}
            </dd>
          </div>

          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Destino</dt>
            <dd className="text-sm font-medium">
              {delivery.city} — {delivery.uf}
            </dd>
          </div>

          {delivery.invoiceNumber && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Nota fiscal</dt>
              <dd className="text-sm font-medium">{delivery.invoiceNumber}</dd>
            </div>
          )}

          {delivery.code && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Pedido</dt>
              <dd className="text-sm font-medium">{delivery.code}</dd>
            </div>
          )}
        </dl>
      </section>

      {delivery.events.length > 0 && (
        <section className="rounded-xl border p-5">
          <h2 className="mb-4 text-sm font-semibold">Histórico</h2>

          <ol className="relative space-y-4 pl-6">
            <span
              aria-hidden="true"
              className="absolute bottom-2 left-[9px] top-2 w-px bg-border"
            />

            {delivery.events.map((event, index) => (
              <li key={`${event.at}-${index}`} className="relative">
                <span
                  className="absolute -left-6 top-1 flex h-[19px] w-[19px]
                  items-center justify-center rounded-full border bg-background"
                >
                  {index === 0 ? (
                    <CheckCircle2
                      className="h-3 w-3 text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <CircleDot
                      className="h-3 w-3 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </span>

                <p className="text-sm font-medium">{event.title}</p>

                <time
                  dateTime={event.at}
                  className="text-xs text-muted-foreground"
                >
                  {formatMoment(event.at)}
                </time>
              </li>
            ))}
          </ol>
        </section>
      )}

      {delivery.proofUrl && (
        <a
          href={delivery.proofUrl}
          className="inline-flex items-center justify-center gap-2 rounded-lg
          border px-4 py-3 text-sm font-medium hover:bg-muted"
        >
          <PackageCheck className="h-4 w-4" />
          Ver o comprovante de entrega
        </a>
      )}

      <footer className="text-center text-xs text-muted-foreground">
        <p className="flex items-center justify-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {delivery.carrierName}
        </p>

        <p className="mt-3">
          <a
            href={`/acompanhar/${params.token}/parar`}
            className="underline underline-offset-2"
          >
            Não quero mais receber mensagens sobre esta entrega
          </a>
        </p>
      </footer>
    </main>
  );
};

export default TrackDeliveryPage;
