import { useEffect, useRef } from "react";
import { useQueryClient } from "react-query";
import { toast } from "sonner";

interface ShipperFormState {
  successMessage?: string;
  createShipperError?: {
    createShipperErrorMessage?: string;
    name?: string[];
    cnpj?: string[];
    email?: string[];
    telephone?: string[];
  };
  updateShipperError?: {
    updateShipperErrorMessage?: string;
    name?: string[];
    cnpj?: string[];
    email?: string[];
    telephone?: string[];
  };
}

interface UseShipperFormProps {
  state: ShipperFormState;
  onClose: () => void;
}

function useShipperForm({ state, onClose }: UseShipperFormProps) {
  const queryClient = useQueryClient();

  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  useEffect(() => {
    const errorMessage =
      state?.createShipperError?.createShipperErrorMessage ??
      state?.updateShipperError?.updateShipperErrorMessage;

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success(state.successMessage);

      const performRevalidation = async () => {
        try {
          // The selector inside the delivery form runs its own react-query
          // cache, so revalidating the server tag alone never reaches it. The
          // pickers read with refetchOnMount and a short staleTime
          // (useCursorSearch), so marking the key stale is enough; other
          // sessions follow the API's catalogChanged(shipper).
          await queryClient.invalidateQueries(["shipper"]);
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

export { useShipperForm };
export type { ShipperFormState };
