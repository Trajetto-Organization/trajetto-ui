"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";

import {
  CaptchaTurnstile,
  useCaptchaToken,
} from "@/components/shared/custom/captcha-turnstile";
import { forgotConsumedCaptcha } from "@/components/shared/custom/captcha-turnstile/token-consumed";

import { Button } from "@/components/ui/button";
import { Loader, MailIcon } from "lucide-react";

import type {
  ForgotPasswordContainerProps,
  ForgotPasswordFormState,
} from "./forgot-password-form.types";

import FormInput from "../../shared/custom/form-input";
import { useLiveValidation } from "@/components/shared/live-validation";
import { handleForgotPassword } from "@/actions/user/forgot-password-user";
import { validateForgotFormSchema } from "@/schemas/forgot-password-schema";

import { ErrorForm } from "../error-form";
import { SuccessForm } from "../success-form";

import { Terms } from "@/components/layouts/terms";

const ForgotPasswordContainer = ({
  state,
}: ForgotPasswordContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  const captcha = useCaptchaToken();
  const resetCaptcha = captcha.reset;

  // Checked as it is left, by the action's own schema (decision 16.700).
  const [email, setEmail] = useState<string>("");
  const live = useLiveValidation({
    schema: validateForgotFormSchema,
    values: { email },
    serverErrors: state.forgotPasswordError,
  });

  // A new widget whenever the answer shows the token was verified (any
  // answer but field errors, the success included): tokens are single-use.
  useEffect(() => {
    if (forgotConsumedCaptcha(state)) resetCaptcha();
  }, [state, resetCaptcha]);

  return (
    <section ref={live.ref} className="animate-fade-in [animation-delay:400ms]">
      <FormInput
        label={"Email"}
        htmlfor={"email"}
        name="email"
        type="email"
        autoFocus={true}
        errorName={live.errorOf("email")}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={"E-mail"}
        icon={<MailIcon className="h-4 w-4 text-gray-500" />}
        disabled={pending}
        autoComplete="email"
      />

      <ErrorForm
        message={state.forgotPasswordError?.forgotPasswordErrorMessage}
      />
      <SuccessForm message={state.successMessage} />

      <div className="mt-6">
        <Button
          className="w-full h-10"
          type="submit"
          // No fresh token, no submit: never the skeleton, never a spent one.
          disabled={captcha.missing || pending}
          aria-describedby={captcha.describedBy}
        >
          Recuperar minha senha
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </div>

      {captcha.required && (
        <>
          <CaptchaTurnstile {...captcha.widget} size="flexible" />

          <input
            type="hidden"
            name="turnstileToken"
            value={captcha.token ?? ""}
          />
        </>
      )}

      <hr className="mt-5" />

      <Terms />
    </section>
  );
};

const ForgotPasswordForm = (): JSX.Element => {
  // Default value for state
  const defaultState: ForgotPasswordFormState = {};
  const [state, dispatch] = useFormState(handleForgotPassword, null);

  return (
    <>
      <div className="mb-7 grid gap-2 text-center">
        <h1
          key={"forgot-title"} // Key to trigger re-animation
          className="animate-fade-in [animation-delay:200ms] text-3xl font-bold"
        >
          Esqueci minha senha
        </h1>
        <p
          key={"forgot-description"} // Key to trigger re-animation
          className="animate-fade-left [animation-delay:300ms] text-muted-foreground"
        >
          Digite seu e-mail abaixo para recuperar a sua senha
        </p>
      </div>

      {/* noValidate: the schema's message under the field, not the browser's bubble. */}
      <form action={dispatch} noValidate>
        <ForgotPasswordContainer state={state ?? defaultState} />
      </form>
    </>
  );
};

export { ForgotPasswordForm };
