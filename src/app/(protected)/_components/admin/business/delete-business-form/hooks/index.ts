import { useEffect, useRef, useState } from "react";
import type {
  DeleteBusinessFormState,
  DeletionStep,
} from "../delete-business-form.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

const RESEND_COOLDOWN_SECONDS = 60;

function useDeleteBusinessForm(state: DeleteBusinessFormState | null) {
  const [isOpenDeleteBusinessForm, setIsOpenDeleteBusinessForm] =
    useState<boolean>(false);

  const [step, setStep] = useState<DeletionStep>("confirm-name");
  const [otpCode, setOtpCode] = useState<string>("");

  const [resendTimer, setResendTimer] = useState<number>(0);
  const toastShownRef = useRef(false);

  const handleDeleteBusinessForm = () => {
    setIsOpenDeleteBusinessForm(!isOpenDeleteBusinessForm);
  };

  const resetForm = () => {
    setStep("confirm-name");
    setOtpCode("");

    setResendTimer(0);
  };

  const goToCodeStep = () => {
    setStep("enter-code");
    setResendTimer(RESEND_COOLDOWN_SECONDS);
  };

  const handleOtpChange = (value: string) => {
    setOtpCode(value);
  };

  const startResendCooldown = () => {
    setResendTimer(RESEND_COOLDOWN_SECONDS);
  };

  useEffect(() => {
    if (resendTimer <= 0) return;

    const timeoutId = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(timeoutId);
  }, [resendTimer]);

  useEffect(() => {
    if (state?.deleteBusinessError) {
      toast.error(state.deleteBusinessError);
      setOtpCode("");
      return;
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success(state.successMessage);

      const performRevalidation = async () => {
        try {
          await Promise.all([
            revalidateTagName("delete-business"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "business";

                return isMatch;
              },
            }),
          ]);
        } catch (error: any) {
          if (process.env.NODE_ENV === "development") {
            console.error("Erro na revalidação:", error);
          }

          toast.error("Erro ao atualizar dados. Recarregue a página.");
        }
      };

      performRevalidation();
      handleDeleteBusinessForm();

      resetForm();
    }

    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    handleDeleteBusinessForm,
    isOpenDeleteBusinessForm,
    step,
    otpCode,
    resendTimer,
    goToCodeStep,
    handleOtpChange,
    startResendCooldown,
    resetForm,
  };
}

export { useDeleteBusinessForm };
