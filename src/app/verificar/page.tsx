import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BadgeCheck, ShieldCheck } from "lucide-react";

import { resolveVerificationTarget } from "./_lib/verification-code";
import { VerifyCodeForm } from "./_components/verify-code-form";

/**
 * Not indexed, like the pages it leads to: it is a door to tokenised
 * receipts, and next.config already sends noindex for /verificar.
 */
export const metadata: Metadata = {
  title: "Verificar comprovante",
  robots: { index: false, follow: false },
};

/** Reads the typed code from the query on every request. */
export const dynamic = "force-dynamic";

/**
 * /verificar without a token (DLVB-10).
 *
 * The PDF prints the verification address beside the QR so a person can type
 * it when the code does not scan; typing it half-way, or following the part a
 * PDF viewer linked, landed on a 404. This page takes the code (or the whole
 * pasted address), checks its shape and sends the person to the receipt's
 * page. A plain GET form: it works without JavaScript, and with it shows
 * the pending state until the result arrives (VerifyCodeForm).
 */
const VerifyEntryPage = ({
  searchParams,
}: {
  searchParams: { codigo?: string | string[] };
}): JSX.Element => {
  const target = resolveVerificationTarget(searchParams.codigo);

  if (target.kind === "redirect") redirect(target.path);

  const invalid = target.kind === "invalid";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-12">
      <header className="text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />

        <h1 className="mt-4 text-2xl font-semibold">
          Verificar comprovante de entrega
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Digite o código impresso ao lado do QR do comprovante ou cole o
          endereço completo. Conferimos se o arquivo guardado é o mesmo que foi
          gerado para a entrega.
        </p>
      </header>

      <VerifyCodeForm
        defaultCode={invalid ? target.input : ""}
        error={
          invalid
            ? "Código inválido. Confira os caracteres: são 64 letras (a–f) e números, sem outros símbolos."
            : null
        }
      />

      <footer className="text-center text-xs text-muted-foreground">
        <p className="flex items-center justify-center gap-1.5">
          <BadgeCheck className="h-3.5 w-3.5" />
          Verificação fornecida por Trajetto
        </p>
      </footer>
    </main>
  );
};

export default VerifyEntryPage;
