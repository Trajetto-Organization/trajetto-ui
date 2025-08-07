import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { newResetPasswordVerification } from "@/actions/new-reset-password-verification";

function useResetPasswordValidationToken() {
  const [error, setError] = useState<string | undefined>("");

  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const onSubmit = useCallback(() => {
    if (error) return;

    if (!token) {
      setError("Token ausente!");
      return;
    }

    newResetPasswordVerification(token)
      .then((data) => {
        setError(data?.error?.errorMessage);
      })
      .catch((error) => {
        setError(error.message);
      });
  }, [token, error]);

  useEffect(() => {
    onSubmit();
  }, [onSubmit]);

  return {
    error,
    token,
  };
}

export { useResetPasswordValidationToken };
