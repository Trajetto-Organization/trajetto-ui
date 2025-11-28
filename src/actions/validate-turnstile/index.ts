"use server";

async function validateTurnstile(token: string | null) {
  if (!token) return false;

  try {
    const result = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY!,
          response: token,
        }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );

    const data = await result.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export { validateTurnstile };
