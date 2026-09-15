import type { Metadata } from "next";

import {
  BadgeCheck,
  CalendarClock,
  Download,
  FileWarning,
  MapPin,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { verifyProof } from "@/lib/public-api";

/**
 * NEVER indexed, and this is not a preference.
 *
 * The URL carries the verification token. A crawler that reached this page
 * would put somebody's delivery receipt — their name, their city, who signed
 * for it — into a search engine, permanently, for a link that was only ever
 * meant for the person holding the printed document.
 */
export const metadata: Metadata = {
  title: "Verificar comprovante",
  robots: { index: false, follow: false, nocache: true },
};

/** Server-rendered on every request: a cached answer here would be a lie. */
export const dynamic = "force-dynamic";

function formatMoment(value: string | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const Field = ({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="text-sm font-medium break-words">{value}</dd>
  </div>
);

const VerifyProofPage = async ({
  params,
}: {
  params: { token: string };
}): Promise<JSX.Element> => {
  const result = await verifyProof(params.token);

  if (!result.ok || !result.data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4 py-12">
        <div className="rounded-xl border p-6 text-center">
          <FileWarning className="mx-auto h-10 w-10 text-muted-foreground" />

          <h1 className="mt-4 text-xl font-semibold">
            Comprovante não encontrado
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            O código deste comprovante não corresponde a nenhum documento. Se
            você o digitou à mão, confira os caracteres; se escaneou o QR,
            tente novamente com mais luz.
          </p>
        </div>
      </main>
    );
  }

  const { intact, storedSha256, summary, url } = result.data;

  // Three states, not two. "O arquivo sumiu" and "o arquivo foi alterado" are
  // different things and a page that collapsed them would accuse a storage
  // outage of forgery.
  const missing = storedSha256 === null;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-12">
      <header className="text-center">
        <p className="text-sm text-muted-foreground">{summary.carrierName}</p>
        <h1 className="mt-1 text-2xl font-semibold">Comprovante de entrega</h1>
      </header>

      <section
        className={`rounded-xl border p-5 text-center ${
          intact
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
            : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
        }`}
        aria-live="polite"
      >
        {intact ? (
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-600 dark:text-amber-400" />
        )}

        <h2 className="mt-3 text-lg font-semibold">
          {intact
            ? "Documento íntegro"
            : missing
              ? "Arquivo indisponível"
              : "Não foi possível confirmar a integridade"}
        </h2>

        <p className="mt-2 text-sm">
          {intact
            ? "O arquivo guardado é exatamente o que foi gerado no momento da entrega."
            : missing
              ? "O registro deste comprovante existe, mas o arquivo não está acessível agora. Isso não indica adulteração — procure a transportadora."
              : "O arquivo guardado não corresponde mais ao registro feito no momento da entrega. Procure a transportadora antes de usar este documento."}
        </p>
      </section>

      <section className="rounded-xl border p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Destinatário" value={summary.recipientName} />
          <Field
            label="Local"
            value={`${summary.city} — ${summary.uf}`}
          />

          <Field label="Nota fiscal" value={summary.invoiceNumber ?? "—"} />
          <Field label="Recebido por" value={summary.receivedBy ?? "—"} />

          <Field
            label="Data da entrega"
            value={formatMoment(summary.deliveredAt)}
          />
          <Field
            label="Documento gerado em"
            value={formatMoment(summary.generatedAt)}
          />
        </dl>

        <div className="mt-5 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Código de integridade (SHA-256)
          </p>
          <p className="mt-1 break-all font-mono text-xs">{summary.sha256}</p>

          {summary.version > 1 && (
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Este comprovante foi regerado ({summary.version}ª versão). Uma
                cópia impressa anterior continua chegando a esta página, mas não
                é a versão atual.
              </span>
            </p>
          )}
        </div>
      </section>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg
          border px-4 py-3 text-sm font-medium hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Abrir o comprovante em PDF
        </a>
      )}

      <footer className="text-center text-xs text-muted-foreground">
        <p className="flex items-center justify-center gap-1.5">
          <BadgeCheck className="h-3.5 w-3.5" />
          Verificação fornecida por Trajetto
        </p>

        <p className="mt-2">
          Este documento reúne informações registradas no momento da entrega e
          permite conferir a integridade do arquivo. Não possui assinatura
          digital ICP-Brasil e não afirma validade jurídica própria.
        </p>

        <p className="mt-2 flex items-center justify-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {summary.carrierName}
        </p>
      </footer>
    </main>
  );
};

export default VerifyProofPage;
