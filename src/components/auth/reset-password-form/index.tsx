"use client";

import { useEffect, useState } from "react";

import { useLiveValidation } from "@/components/shared/live-validation";
import { validateResetUserPasswordFormSchema } from "@/schemas/reset-password-schema";
import { useFormState, useFormStatus } from "react-dom";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import { Loader } from "lucide-react";

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

  // The confirmation is checked against the password as either changes, once
  // it was left (decision 16.700): the schema's refine, run on the client.
  const [values, setValues] = useState({ password: "", confirm_password: "" });
  const live = useLiveValidation({
    schema: validateResetUserPasswordFormSchema,
    values,
    serverErrors: state.resetPasswordError,
  });

  return (
    <section ref={live.ref} className="animate-fade-in [animation-delay:400ms]">
      <section className="space-y-4">
        {/* Ids without spaces: "Confirme sua senha" was not a valid id, so the
            label and the error could not be tied to the field. */}
        <FormInput
          data-test="password"
          label={"Senha"}
          htmlfor={"password"}
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder={"Deve ter no mínimo 7 caracteres"}
          value={values.password}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
          errorName={live.errorOf("password")}
          disabled={pending || Boolean(error) || Boolean(state?.successMessage)}
          className="pr-10"
        />

        <FormInput
          data-test="confirm-password"
          label={"Confirme sua senha"}
          htmlfor={"confirm_password"}
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          placeholder={"As senhas devem corresponder"}
          value={values.confirm_password}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              confirm_password: event.target.value,
            }))
          }
          errorName={live.errorOf("confirm_password")}
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
    </section>
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
        <h1
          key={"reset-password-title"} // Key to trigger re-animation
          className="animate-fade-in [animation-delay:200ms] text-3xl font-bold"
        >
          Redefinir Senha
        </h1>
        <p
          key={"reset-password-description"} // Key to trigger re-animation
          className="animate-fade-left [animation-delay:300ms] text-muted-foreground"
        >
          Defina uma nova senha para recuperar o seu acesso.
        </p>
      </div>

      <form
        noValidate
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
