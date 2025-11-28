"use client";

import { useFormState, useFormStatus } from "react-dom";

import {
  TwoFactorAuthenticationFormContainerProps,
  TwoFactorFormState,
} from "./dto";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { motion } from "framer-motion";
import { Loader } from "lucide-react";

import { Button } from "@/components/ui/button";

import { handleTwoFactorAuthenticationUser } from "@/actions/two-factor-authentication-user";
import { ErrorForm } from "../error-form";

import { useTwoFactorForm } from "./hooks";
import { Terms } from "@/components/layouts/terms";

interface TwoFactorAuthenticationFormProps {
  email: string;
}

const TwoFactorAuthenticationFormContainer = ({
  state,
  email,
}: TwoFactorAuthenticationFormContainerProps) => {
  const {
    handleOTPChange,
    isOTPComplete,
    otpCode,
    handleResendCode,
    resendTimer,
  } = useTwoFactorForm(email);

  const { pending } = useFormStatus();

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
    >
      <InputOTP
        maxLength={6}
        name="code"
        value={otpCode}
        onChange={(value) => handleOTPChange(value)}
        containerClassName="w-full justify-center"
      >
        <div className="flex w-full justify-between items-center">
          {/* First group */}
          <InputOTPGroup className="flex-1">
            {Array.from({ length: 3 }, (_, i) => (
              <InputOTPSlot key={i} index={i} className="w-full" />
            ))}
          </InputOTPGroup>

          {/* Separator in the middle (outside groups) */}
          <InputOTPSeparator className="mx-2" />

          {/* Second group */}
          <InputOTPGroup className="flex-1">
            {Array.from({ length: 3 }, (_, i) => (
              <InputOTPSlot key={i + 3} index={i + 3} className="w-full" />
            ))}
          </InputOTPGroup>
        </div>
      </InputOTP>

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

      <ErrorForm
        message={
          state.twoFactorError?.twoFactorErrorMessage ||
          (state.twoFactorError?.code &&
          Array.isArray(state.twoFactorError.code)
            ? state.twoFactorError.code[0]
            : state.twoFactorError?.code?.toString())
        }
      />

      <div className="mt-6">
        <Button
          data-test="two-factor"
          type="submit"
          aria-label={"Autenticação de dois fatores"}
          disabled={pending || !isOTPComplete}
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
    </motion.section>
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
