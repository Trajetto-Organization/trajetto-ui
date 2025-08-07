"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";

import { handleLoginUser } from "@/actions/login-user";
import { Button } from "@/components/ui/button";

import { Loader, LockIcon, MailIcon } from "lucide-react";
import { motion } from "framer-motion";

import FormInput from "../../custom/form-input";
import { TwoFactorAuthenticationForm } from "../two-factor-authentication-form";

import { ErrorForm } from "../error-form";
import { LoginFormContainerProps, LogInFormState } from "./dto";

import { useLoginMessages } from "./hooks";
import { Terms } from "@/components/layouts/terms";

import { SuccessForm } from "../success-form";

const LoginFormContainer = ({
  state,
}: LoginFormContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
    >
      <div className="space-y-4">
        <FormInput
          label={"Email"}
          htmlfor={"email"}
          name="email"
          type="email"
          errorName={state?.loginError?.email}
          placeholder={"E-mail"}
          icon={<MailIcon className="h-4 w-4 text-gray-500" />}
          disabled={pending}
        />

        <FormInput
          label={"Senha"}
          htmlfor={"password"}
          name="password"
          type="password"
          errorName={state?.loginError?.password}
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
        <Button className="w-full h-10" type="submit" disabled={pending}>
          Entrar
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </div>

      <hr className="mt-7" />

      <Terms />
    </motion.section>
  );
};

const LoginForm = (): JSX.Element => {
  const defaultState: LogInFormState = {};
  const [state, dispatch] = useFormState(handleLoginUser, null);

  useLoginMessages();

  return (
    <>
      <div className="mb-7 grid gap-2 text-center">
        <motion.h1
          key={state?.twoFactor ? "two-factor-title" : "login-title"} // Key to trigger re-animation
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold"
        >
          {state?.twoFactor ? "Autenticação (2FA)" : "Entrar"}
        </motion.h1>
        <motion.p
          key={
            state?.twoFactor ? "two-factor-description" : "login-description"
          } // Key to trigger re-animation
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, type: "tween" }}
          className="text-muted-foreground"
        >
          {state?.twoFactor
            ? "Verifique seu e-mail para continuar"
            : "Entre com sua conta para continuar"}
        </motion.p>
      </div>

      {state?.twoFactor ? (
        <TwoFactorAuthenticationForm email={state.twoFactorEmail} />
      ) : (
        <form action={dispatch}>
          <LoginFormContainer state={state ?? defaultState} />
        </form>
      )}
    </>
  );
};

export { LoginForm };
