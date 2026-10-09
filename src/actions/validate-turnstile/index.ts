"use server";

import { logActionError } from "@/lib/log-action-error";
import { apiFetch } from "@/lib/api-fetch";

async function validateTurnstile(token: string | null) {
  if (!token) return false;

  try {
    const secret = process.env.TURNSTILE_SECRET_KEY;

    if (!secret) {
      console.error("[Turnstile] TURNSTILE_SECRET_KEY is not defined");
      return false;
    }

    const result = await apiFetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
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
