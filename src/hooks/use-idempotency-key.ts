"use client";

import { useCallback, useEffect, useRef } from "react";

import { keyForSubmission, type SubmissionKey } from "@/lib/idempotency-key";

/**
 * The Idempotency-Key of a create form's submission (IDEMP-14).
 *
 * Returns the function the form calls with the FormData it is about to
 * dispatch, after everything else was appended to it. The same content sent
 * again — a lost answer, a second click, "Salvar" again after an error — gets
 * the same key; different content gets a new one (keyForSubmission), and so
 * does anything sent after a success, so the next record is a new one.
 * `settled` is the action's state object: `useFormState` hands back a new one
 * on every answer, which is what makes two successes in a row two renewals
 * even when both carry the same message.
 */
function useIdempotencyKey(
  settled?: { successMessage?: unknown } | null,
): (payload: FormData) => string {
  const last = useRef<SubmissionKey | null>(null);

  useEffect(() => {
    if (settled?.successMessage) last.current = null;
  }, [settled]);

  return useCallback((payload: FormData) => {
    last.current = keyForSubmission(last.current, payload);

    return last.current.key;
  }, []);
}

export { useIdempotencyKey };
