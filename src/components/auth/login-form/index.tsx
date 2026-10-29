"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";

import Link from "next/link";

import { handleLoginUser } from "@/actions/user/login-user";
import { Button } from "@/components/ui/button";
import { useLiveValidation } from "@/components/shared/live-validation";
import { validateLoginUserFormSchema } from "@/schemas/login-schema";

import { Loader, LockIcon, MailIcon } from "lucide-react";

import FormInput from "../../shared/custom/form-input";

import { TwoFactorAuthenticationForm } from "../two-factor-authentication-form";
import {
  CaptchaTurnstile,
  useCaptchaToken,
} from "@/components/shared/custom/captcha-turnstile";
import { loginConsumedCaptcha } from "@/components/shared/custom/captcha-turnstile/token-consumed";

import type {
  LoginFormContainerProps,
  LogInFormState,
} from "./login-form.types";
import { ErrorForm } from "../error-form";

import { useLoginMessages } from "./hooks";
import { Terms } from "@/components/layouts/terms";

import { SuccessForm } from "../success-form";

const LoginFormContainer = ({
  state,
}: LoginFormContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  const captcha = useCaptchaToken();
  const resetCaptcha = captcha.reset;

  // Controlled so the action's schema can check each field as it is left
  // (decision 16.700); the action parses the same schema again.
  const [values, setValues] = useState({ email: "", password: "" });
  const live = useLiveValidation({
    schema: validateLoginUserFormSchema,
    values,
    serverErrors: state?.loginError,
  });

  // A new widget whenever the answer shows the token was verified (any
  // answer but field errors, the "verify your e-mail" notice included):
  // tokens are single-use.
  useEffect(() => {
    if (loginConsumedCaptcha(state)) resetCaptcha();
  }, [state, resetCaptcha]);

  return (
    <section ref={live.ref} className="animate-fade-in [animation-delay:400ms]">
      <div className="space-y-4">
        <FormInput
          label={"Email"}
          htmlfor={"email"}
          name="email"
          type="email"
          errorName={live.errorOf("email")}
          value={values.email}
          onChange={(event) =>
            setValues((current) => ({ ...current, email: event.target.value }))
          }
          placeholder={"E-mail"}
          icon={<MailIcon className="h-4 w-4 text-gray-500" />}
          disabled={pending}
          autoComplete="email"
        />

        <FormInput
          label={"Senha"}
          htmlfor={"password"}
          name="password"
          type="password"
          errorName={live.errorOf("password")}
          value={values.password}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
          autoComplete="current-password"
          placeholder={"Senha"}
          icon={<LockIcon className="h-4 w-4 text-gray-500" />}
          disabled={pending}
        />
      </div>

      <div className="mt-1">
        <Link
          href="/forgot"
          className="underline underline-offset-4
          hover:text-primary text-sm text-muted-foreground"
        >
          Esqueceu sua senha ?
        </Link>
      </div>

      <ErrorForm message={state.loginError?.loginErrorMessage} />
      <SuccessForm message={state.emailVerification} />

      <div className="mt-6">
        <Button
          className="w-full h-10"
          type="submit"
          // No fresh token, no submit: never the skeleton, never a spent one.
          disabled={captcha.missing || pending}
          aria-describedby={captcha.describedBy}
        >
          Entrar
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

const LoginForm = (): JSX.Element => {
  const defaultState: LogInFormState = {};
  const [state, dispatch] = useFormState(handleLoginUser, null);

  useLoginMessages();

  return (
    <>
      <div className="mb-7 grid gap-2 text-center">
        <h1
          key={state?.twoFactor ? "two-factor-title" : "login-title"} // Key to trigger re-animation
          className="animate-fade-in [animation-delay:200ms] text-3xl font-bold"
        >
          {state?.twoFactor ? "Autenticação (2FA)" : "Entrar"}
        </h1>
        <p
          key={
            state?.twoFactor ? "two-factor-description" : "login-description"
          } // Key to trigger re-animation
          className="animate-fade-left [animation-delay:300ms] text-muted-foreground"
        >
          {state?.twoFactor
            ? "Verifique seu e-mail para continuar"
            : "Entre com sua conta para continuar"}
        </p>
      </div>

      {state?.twoFactor ? (
        <TwoFactorAuthenticationForm email={state.twoFactorEmail} />
      ) : (
        // noValidate: the schema's messages, in Portuguese and under each
        // field, instead of the browser's bubble that blocked them.
        <form action={dispatch} noValidate>
          <LoginFormContainer state={state ?? defaultState} />
        </form>
      )}
    </>
  );
};

export { LoginForm };
