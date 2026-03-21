"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import { Loader } from "lucide-react";
import { motion } from "framer-motion";

import type {
  ResetPasswordFormContainerProps,
  ResetPasswordFormState,
} from "./reset-password-form.types";
import FormInput from "../../shared/custom/form-input";

import { handleResetPassword } from "@/actions/user/reset-user-password";
import { useResetPasswordValidationToken } from "./hooks/reset-password-validation";

import { ErrorForm } from "../error-form";
import { SuccessForm } from "../success-form";

const ResetPasswordFormContainer = ({
  state,
  error,
}: ResetPasswordFormContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
    >
      <section className="space-y-4">
        <FormInput
          data-test="password"
          label={"Senha"}
          htmlfor={"Senha"}
          name="password"
          type="password"
          placeholder={"Deve ter no mínimo 7 caracteres"}
          errorName={state.resetPasswordError?.password}
          disabled={pending || Boolean(error) || Boolean(state?.successMessage)}
          className="pr-10"
        />

        <FormInput
          data-test="confirm-password"
          label={"Confirme sua senha"}
          htmlfor={"Confirme sua senha"}
          name="confirm_password"
          type="password"
          placeholder={"As senhas devem corresponder"}
          errorName={state.resetPasswordError?.confirm_password}
          disabled={pending || Boolean(error) || Boolean(state?.successMessage)}
          className="pr-10"
        />
      </section>

      <ErrorForm
        message={state?.resetPasswordError?.resetPasswordErrorMessage || error}
      />
      <SuccessForm message={state?.successMessage} />

      <div className="mt-7">
        <Button
          type="submit"
          aria-label={"Redefinir senha"}
          disabled={pending || Boolean(error) || Boolean(state?.successMessage)}
          className="w-full"
        >
          Redefinir Senha
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </div>
    </motion.section>
  );
};

const ResetPasswordForm = (): JSX.Element => {
  const router = useRouter();
  const { token, error, countdown } = useResetPasswordValidationToken();

  const defaultState: ResetPasswordFormState = {};
  const [state, dispatch] = useFormState(handleResetPassword, null);

  const [successCountdown, setSuccessCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (state?.successMessage && successCountdown === null) {
      setSuccessCountdown(3);
    }
  }, [state?.successMessage, successCountdown]);

  useEffect(() => {
    if (successCountdown === null) return;

    if (successCountdown === 0) {
      router.push("/login");
    } else {
      const timer = setTimeout(() => {
        setSuccessCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [successCountdown, router]);

  const activeCountdown = countdown ?? successCountdown;
  const showRedirect =
    (error || state?.successMessage) && activeCountdown !== null;

  return (
    <>
      <div className="mb-7 grid gap-2 text-center">
        <motion.h1
          key={"reset-password-title"} // Key to trigger re-animation
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold"
        >
          Redefinir Senha
        </motion.h1>
        <motion.p
          key={"reset-password-description"} // Key to trigger re-animation
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, type: "tween" }}
          className="text-muted-foreground"
        >
          Defina uma nova senha para recuperar o seu acesso.
        </motion.p>
      </div>

      <form
        action={(formData: FormData) => {
          formData.append("token", token as string);
          return dispatch(formData);
        }}
      >
        <ResetPasswordFormContainer
          state={state ?? defaultState}
          error={error}
        />
      </form>

      {showRedirect && (
        <p
          className="text-sm text-muted-foreground
          text-center animate-pulse mt-4"
        >
          Redirecionando para o login em {activeCountdown}...
        </p>
      )}
    </>
  );
};

export { ResetPasswordForm };
