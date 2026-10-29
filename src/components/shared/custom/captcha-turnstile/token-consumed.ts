/**
 * Whether a form's server answer means its Turnstile token was used.
 *
 * Tokens are single-use. Each action checks the fields first (Zod) and only
 * then sends the token to siteverify (login, forgot) or to the API (quote).
 * So an answer with only field errors left the token unused, and every
 * other answer spent it: an error message, the "verify your e-mail" notice,
 * the two-factor step, a success. Sending the same token again would fail
 * with "Falha no desafio de segurança." (timeout-or-duplicate).
 */

interface LoginAnswer {
  loginError?: { loginErrorMessage?: string };
  emailVerification?: string;
  twoFactor?: boolean;
}

interface ForgotAnswer {
  forgotPasswordError?: { forgotPasswordErrorMessage?: string };
  successMessage?: string;
}

interface QuoteAnswer {
  createQuoteError?: { createQuoteErrorMessage?: string };
  successMessage?: string;
}

function loginConsumedCaptcha(state: LoginAnswer | null | undefined): boolean {
  return Boolean(
    state?.loginError?.loginErrorMessage ||
    state?.emailVerification ||
    state?.twoFactor,
  );
}

function forgotConsumedCaptcha(
  state: ForgotAnswer | null | undefined,
): boolean {
  return Boolean(
    state?.forgotPasswordError?.forgotPasswordErrorMessage ||
    state?.successMessage,
  );
}

function quoteConsumedCaptcha(state: QuoteAnswer | null | undefined): boolean {
  return Boolean(
    state?.createQuoteError?.createQuoteErrorMessage || state?.successMessage,
  );
}

export { forgotConsumedCaptcha, loginConsumedCaptcha, quoteConsumedCaptcha };
