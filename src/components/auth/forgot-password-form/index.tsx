"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";

import Turnstile from "react-turnstile";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Loader, MailIcon } from "lucide-react";

import type {
  ForgotPasswordContainerProps,
  ForgotPasswordFormState,
} from "./forgot-password-form.types";

import FormInput from "../../shared/custom/form-input";
import { handleForgotPassword } from "@/actions/user/forgot-password-user";

import { ErrorForm } from "../error-form";
import { SuccessForm } from "../success-form";

import { Terms } from "@/components/layouts/terms";

const ForgotPasswordContainer = ({
  state,
}: ForgotPasswordContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  const [isCaptchaValid, setIsCaptchaValid] = useState<boolean>(false);
  const [turnstileKey, setTurnstileKey] = useState<number>(0);

  // Reset Turnstile after each form submission (tokens are single-use)
  useEffect(() => {
    if (state?.forgotPasswordError) {
      setIsCaptchaValid(false);
      setTurnstileKey((prev) => prev + 1);
    }
  }, [state]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
    >
      <FormInput
        label={"Email"}
        htmlfor={"email"}
        name="email"
        type="email"
        autoFocus={true}
        errorName={state.forgotPasswordError?.email}
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
          disabled={
            (process.env.NODE_ENV === "production" && !isCaptchaValid) ||
            pending
          }
        >
          Recuperar minha senha
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </div>

      {process.env.NODE_ENV === "production" && (
        <>
          <Turnstile
            key={turnstileKey}
            sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={(token) => {
              const input = document.getElementById(
                "turnstile-token",
              ) as HTMLInputElement;

              if (input) input.value = token;
              setIsCaptchaValid(true);
            }}
            theme="auto"
            size="flexible"
            className="mt-5"
          />

          <input id="turnstile-token" type="hidden" name="turnstileToken" />
        </>
      )}

      <hr className="mt-5" />

      <Terms />
    </motion.section>
  );
};

const ForgotPasswordForm = (): JSX.Element => {
  // Default value for state
  const defaultState: ForgotPasswordFormState = {};
  const [state, dispatch] = useFormState(handleForgotPassword, null);

  return (
    <>
      <div className="mb-7 grid gap-2 text-center">
        <motion.h1
          key={"forgot-title"} // Key to trigger re-animation
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold"
        >
          Esqueci minha senha
        </motion.h1>
        <motion.p
          key={"forgot-description"} // Key to trigger re-animation
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, type: "tween" }}
          className="text-muted-foreground"
        >
          Digite seu e-mail abaixo para recuperar a sua senha
        </motion.p>
      </div>

      <form action={dispatch}>
        <ForgotPasswordContainer state={state ?? defaultState} />
      </form>
    </>
  );
};

export { ForgotPasswordForm };
