import { useEffect, useState } from "react";
import { handleResendTwoFactorCode } from "@/actions/user/resend-two-factor-code";
import { isStaleActionResult } from "@/lib/action-result";

import { toast } from "sonner";

import {
  RESEND_COOLDOWN_SECONDS,
  readResendCooldown,
  recordResend,
} from "./resend-cooldown";

function useTwoFactorForm(email: string) {
  // State to hold the OTP code
  const [otpCode, setOtpCode] = useState<string>("");
  const [resendTimer, setResendTimer] = useState<number>(0);

  // Handle change event for OTP input
  const handleOTPChange = (value: string) => {
    setOtpCode(value);
  };

  // Check if the OTP has exactly 6 digits
  const isOTPComplete = otpCode.length === 6;

  // Picks up a cooldown started before a reload (and drops the old
  // per-e-mail entries).
  useEffect(() => {
    const remaining = readResendCooldown();

    if (remaining > 0) setResendTimer(remaining);
  }, []);

  const handleResendCode = async () => {
    try {
      const resendTwoFactorCode = await handleResendTwoFactorCode(email);

      if (isStaleActionResult(resendTwoFactorCode)) return;

      if (resendTwoFactorCode.twoFactorError) {
        toast.error(resendTwoFactorCode.twoFactorError);
      } else if (resendTwoFactorCode.successMessage) {
        toast.success(resendTwoFactorCode.successMessage);

        recordResend();
        setResendTimer(RESEND_COOLDOWN_SECONDS);
      }
    } catch (error) {
      toast.error("Falha ao reenviar o código. Por favor, tente novamente.");
    }
  };

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  return {
    handleOTPChange,
    isOTPComplete,
    otpCode,
    handleResendCode,
    resendTimer,
  };
}

export { useTwoFactorForm };
