import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { revalidateTagName } from "@/actions/revalidate";

interface DeliveryFieldErrors {
  shipperId?: string[];
  code?: string[];
  invoice_key?: string[];
  recipient_name?: string[];
  recipient_document?: string[];
  recipient_email?: string[];
  recipient_telephone?: string[];
  cep?: string[];
  city?: string[];
  uf?: string[];
  street?: string[];
  address_number?: string[];
  complement?: string[];
  neighborhood?: string[];
  scheduled_date?: string[];
  notes?: string[];
  items?: string[];
}

interface DeliveryFormState {
  successMessage?: string;
  updateDeliveryError?: DeliveryFieldErrors & {
    updateDeliveryErrorMessage?: string;
  };
  createDeliveryError?: {
    createDeliveryErrorMessage?: string;
    shipperId?: string[];
    code?: string[];
    invoice_key?: string[];
    recipient_name?: string[];
    recipient_document?: string[];
    recipient_email?: string[];
    recipient_telephone?: string[];
    cep?: string[];
    city?: string[];
    uf?: string[];
    street?: string[];
    address_number?: string[];
    complement?: string[];
    neighborhood?: string[];
    scheduled_date?: string[];
    notes?: string[];
    items?: string[];
  };
}

interface UseDeliveryFormProps {
  state: DeliveryFormState;
  onClose: () => void;
}

function useDeliveryForm({ state, onClose }: UseDeliveryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  useEffect(() => {
    const errorMessage =
      state?.createDeliveryError?.createDeliveryErrorMessage ??
      state?.updateDeliveryError?.updateDeliveryErrorMessage;

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success(state.successMessage);

      const performRevalidation = async () => {
        try {
          await revalidateTagName("update-delivery");
        } catch (error: any) {
          if (process.env.NODE_ENV === "development") {
            console.error("Erro na revalidação:", error);
          }

          toast.error("Erro ao atualizar dados. Recarregue a página.");
        }
      };

      performRevalidation();
      onClose();
    }

    return () => {
      toastShownRef.current = false;
    };
  }, [state, onClose]);

  return { formRef };
}

export { useDeliveryForm };
export type { DeliveryFormState, DeliveryFieldErrors };
