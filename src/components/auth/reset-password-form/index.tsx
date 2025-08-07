"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

import { Loader } from "lucide-react";
import { motion } from "framer-motion";

import FormInput from "../../custom/form-input";

import { handleResetPassword } from "@/actions/reset-user-password";
import { ResetPasswordFormContainerProps, ResetPasswordFormState } from "./dto";

import { ErrorForm } from "../error-form";
import { SuccessForm } from "../success-form";

import { useResetPasswordValidationToken } from "./hooks/reset-password-validation";

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
          disabled={pending || Boolean(error)}
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
          disabled={pending || Boolean(error)}
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
          disabled={pending || Boolean(error)}
          className="w-full"
        >
          Redefinir senha
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
  const { token, error } = useResetPasswordValidationToken();

  // Default value for state
  const defaultState: ResetPasswordFormState = {};
  const [state, dispatch] = useFormState(handleResetPassword, null);

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
    </>
  );
};

export { ResetPasswordForm };
