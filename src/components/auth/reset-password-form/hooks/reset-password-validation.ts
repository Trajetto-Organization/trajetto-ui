import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { newResetPasswordVerification } from "@/actions/user/new-reset-password-verification";

function useResetPasswordValidationToken() {
  const router = useRouter();

  const [error, setError] = useState<string | undefined>("");
  const [countdown, setCountdown] = useState<number | null>(null);

  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const onSubmit = useCallback(() => {
    if (error) return;

    if (!token) {
      setError("Token ausente!");
      setCountdown(3);

      return;
    }

    newResetPasswordVerification(token)
      .then((data) => {
        if (data?.error?.errorMessage) {
          setError(data.error.errorMessage);
          setCountdown(3);
        }
      })
      .catch((error) => {
        setError(error.message);
        setCountdown(3);
      });
  }, [token, error]);

  useEffect(() => {
    onSubmit();
  }, [onSubmit]);

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
    token,
    countdown,
  };
}

export { useResetPasswordValidationToken };
