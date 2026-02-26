import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { newVerification } from "@/actions/user/new-verification";

function useNewVerificationValidationToken() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");

  const [countdown, setCountdown] = useState<number | null>(null);
  const tokenRef = useRef<string | null>(searchParams.get("token"));

  const verificationAttemptedRef = useRef(false);

  const processVerification = useCallback(async () => {
    if (verificationAttemptedRef.current || success || error) {
      return;
    }

    verificationAttemptedRef.current = true;
    const token = tokenRef.current;

    if (!token) {
      setError("Token ausente!");
      setCountdown(3);

      return;
    }

    try {
      const result = await newVerification(token);

      if (result.successMessage) {
        setSuccess(result.successMessage);
        setCountdown(3);
      } else if (result.error?.errorMessage) {
        setError(result.error.errorMessage);
        setCountdown(3);
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro na verificação");
      setCountdown(3);
    }
  }, [success, error]);

  useEffect(() => {
    processVerification();
  }, [processVerification]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      router.push("/login");
    } else {
      const timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [countdown, router]);

  return {
    error,
    success,
    countdown,
  };
}

export { useNewVerificationValidationToken };
