"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldShell } from "@/components/shared/custom/field-shell";

interface VerifyCodeFormProps {
  /** What the person typed last time, when the server refused it. */
  defaultCode?: string;
  /** The server's refusal of the last code, or null. */
  error?: string | null;
}

/**
 * The code form of /verificar, with the app's pending pattern (decision
 * 16.64): once submitted, the field and the button are disabled, the button
 * spins and says "Verificando…" and the form is aria-busy until the result
 * page arrives, so a second press cannot send the code again and the person
 * sees that it is working.
 *
 * Still a plain GET form, so it works without JavaScript. The field is
 * disabled in the submit handler, and React may flush that before the browser
 * collects the entries; a disabled field is not submitted, so the code also
 * rides in a hidden field drawn in the same render. Whichever runs first, the
 * code goes exactly once.
 */
const VerifyCodeForm = ({
  defaultCode = "",
  error = null,
}: VerifyCodeFormProps): JSX.Element => {
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const pending = submittedCode !== null;

  // Back from the result page, the browser may restore this page from its
  // cache as it was left: pending. It is answered by then.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setSubmittedCode(null);
    };

    window.addEventListener("pageshow", reset);

    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (pending) {
      event.preventDefault();
      return;
    }

    const code = new FormData(event.currentTarget).get("codigo");

    setSubmittedCode(typeof code === "string" ? code : "");
  };

  return (
    <form
      action="/verificar"
      method="get"
      className="space-y-4 rounded-xl border p-5"
      aria-busy={pending || undefined}
      onSubmit={onSubmit}
      data-verify-form
    >
      <FieldShell
        label="Código de verificação *"
        htmlFor="codigo"
        error={error}
        hint="É a sequência depois de /verificar/ no endereço impresso."
      >
        {(control) => (
          <Input
            {...control}
            name="codigo"
            required
            disabled={pending}
            defaultValue={defaultCode}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono"
          />
        )}
      </FieldShell>

      {pending && <input type="hidden" name="codigo" value={submittedCode} />}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Verificando…</span>
          </>
        ) : (
          "Verificar"
        )}
      </Button>
    </form>
  );
};

export { VerifyCodeForm };
