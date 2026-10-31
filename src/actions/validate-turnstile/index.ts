"use server";

import { logActionError } from "@/lib/log-action-error";
import { apiFetch } from "@/lib/api-fetch";
import { turnstileSiteverifyUrl } from "@/lib/turnstile-siteverify";

async function validateTurnstile(token: string | null) {
  if (!token) return false;

  try {
    const secret = process.env.TURNSTILE_SECRET_KEY;

    if (!secret) {
      console.error("[Turnstile] TURNSTILE_SECRET_KEY is not defined");
      return false;
    }

    // Cloudflare, unless the secret is one of its test secrets and the
    // browser suites named a local double (src/lib/turnstile-siteverify.ts).
    const result = await apiFetch(
      turnstileSiteverifyUrl(secret, process.env.TURNSTILE_SITEVERIFY_URL),
      {
        method: "POST",
        body: new URLSearchParams({
          secret,
          response: token,
        }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );

    const data = await result.json();

    if (!data.success) {
      console.error("[Turnstile] Validation failed:", data);
    }

    return data.success === true;
  } catch (error) {
    logActionError("validate-turnstile", error);
    return false;
  }
}

export { validateTurnstile };
