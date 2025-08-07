"use client";

import { useFormState, useFormStatus } from "react-dom";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Loader, MailIcon } from "lucide-react";

import { ForgotPasswordContainerProps, ForgotPasswordFormState } from "./dto";
import FormInput from "../../custom/form-input";

import { handleForgotPassword } from "@/actions/forgot-password-user";

import { ErrorForm } from "../error-form";
import { SuccessForm } from "../success-form";

import { Terms } from "@/components/layouts/terms";

const ForgotPasswordContainer = ({
  state,
}: ForgotPasswordContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

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
      />

      <ErrorForm
        message={state.forgotPasswordError?.forgotPasswordErrorMessage}
      />

      <SuccessForm message={state.successMessage} />

      <div className="mt-6">
        <Button className="w-full h-10" type="submit" disabled={pending}>
          Recuperar minha senha
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
