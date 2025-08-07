import { useEffect, useState } from "react";
import { handleResendTwoFactorCode } from "@/actions/resend-two-factor-code";

import { toast } from "sonner";

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

  // Initialize timer from localStorage on component mount
  useEffect(() => {
    const lastResendTime = localStorage.getItem(`lastResendTime-${email}`);

    if (lastResendTime) {
      const elapsedSeconds = Math.floor(
        (Date.now() - parseInt(lastResendTime)) / 1000,
      );
      const remainingTime = 10 - elapsedSeconds;

      if (remainingTime > 0) {
        setResendTimer(remainingTime);
      }
    }
  }, [email]);

  const handleResendCode = async () => {
    try {
      const resendTwoFactorCode = await handleResendTwoFactorCode(email);

      if (resendTwoFactorCode.twoFactorError) {
        toast.error(resendTwoFactorCode.twoFactorError);
      } else if (resendTwoFactorCode.successMessage) {
        toast.success(resendTwoFactorCode.successMessage);

        // Store the current timestamp in localStorage
        localStorage.setItem(`lastResendTime-${email}`, Date.now().toString());
        setResendTimer(10);
      }
    } catch (error) {
      toast.error("Failed to resend code. Please try again.");
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
