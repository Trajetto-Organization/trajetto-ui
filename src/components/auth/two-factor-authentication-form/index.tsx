"use client";

import { useFormState, useFormStatus } from "react-dom";

import type {
  TwoFactorAuthenticationFormContainerProps,
  TwoFactorFormState,
} from "./two-factor-authentication-form.types";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldShell } from "@/components/shared/custom/field-shell";
import { useLiveValidation } from "@/components/shared/live-validation";
import { cn } from "@/lib/utils";
import { validateTwoFactorUserFormSchema } from "@/schemas/two-factor-schema";

import { handleTwoFactorAuthenticationUser } from "@/actions/user/two-factor-authentication-user";
import { ErrorForm } from "../error-form";

import { useTwoFactorForm } from "./hooks";
import { Terms } from "@/components/layouts/terms";

interface TwoFactorAuthenticationFormProps {
  email: string;
}

const TwoFactorAuthenticationFormContainer = ({
  state,
  email,
}: TwoFactorAuthenticationFormContainerProps): JSX.Element => {
  const { handleOTPChange, otpCode, handleResendCode, resendTimer } =
    useTwoFactorForm(email);

  const { pending } = useFormStatus();

  // The code is checked once the field is left, then as it is typed; the
  // button stays enabled and a short code says so under the field
  // (decisions 16.700 and 16.701).
  const live = useLiveValidation({
    schema: validateTwoFactorUserFormSchema,
    values: { code: otpCode },
    serverErrors: state.twoFactorError,
    controlIds: { code: "two-factor-code" },
  });

  const codeError = live.errorOf("code");

  return (
    <section ref={live.ref} className="animate-fade-in [animation-delay:400ms]">
      <FieldShell
        label="Código de verificação *"
        htmlFor="two-factor-code"
        error={codeError}
      >
        {(control) => (
          <InputOTP
            {...control}
            maxLength={6}
            name="code"
            value={otpCode}
            disabled={pending}
            autoComplete="one-time-code"
            onChange={(value) => handleOTPChange(value)}
            containerClassName="w-full justify-center"
          >
            <div className="flex w-full justify-between items-center">
              {/* First group */}
              <InputOTPGroup className="flex-1">
                {Array.from({ length: 3 }, (_, i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className={cn(
                      "w-full",
                      codeError && "border-red-600 dark:border-red-500",
                    )}
                  />
                ))}
              </InputOTPGroup>

              {/* Separator in the middle (outside groups) */}
              <InputOTPSeparator className="mx-2" />

              {/* Second group */}
              <InputOTPGroup className="flex-1">
                {Array.from({ length: 3 }, (_, i) => (
                  <InputOTPSlot
                    key={i + 3}
                    index={i + 3}
                    className={cn(
                      "w-full",
                      codeError && "border-red-600 dark:border-red-500",
                    )}
                  />
                ))}
              </InputOTPGroup>
            </div>
          </InputOTP>
        )}
      </FieldShell>

      <div className="mt-3">
        <Button
          type="button"
          onClick={handleResendCode}
          disabled={resendTimer > 0 || pending}
          className="rounded-full text-left py-1 px-0 h-7 
          text-sm hover:text-primary text-slate-800"
          variant="link"
          size="sm"
        >
          {resendTimer > 0
            ? `Reenviar código (${resendTimer}s)`
            : "Reenviar código"}
        </Button>
      </div>

      {/* The code's own message sits under the field; this is the rest. */}
      <ErrorForm message={state.twoFactorError?.twoFactorErrorMessage} />

      <div className="mt-6">
        <Button
          data-test="two-factor"
          type="submit"
          aria-label={"Autenticação de dois fatores"}
          disabled={pending}
          className="w-full"
        >
          <p>Confirme Seu Código</p>
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </div>

      <hr className="mt-5" />

      <Terms />
    </section>
  );
};

const TwoFactorAuthenticationForm = ({
  email,
}: TwoFactorAuthenticationFormProps): JSX.Element => {
  // Default value for state
  const defaultState: TwoFactorFormState = {};
  const [state, dispatch] = useFormState(
    handleTwoFactorAuthenticationUser,
    null,
  );

  return (
    <form
      noValidate
      action={(formData: FormData) => {
        formData.append("email", email);
        return dispatch(formData);
      }}
    >
      <TwoFactorAuthenticationFormContainer
        state={state ?? defaultState}
        email={email}
      />
    </form>
  );
};

export { TwoFactorAuthenticationForm };
