import { useEffect, useRef } from "react";
import { useQueryClient } from "react-query";
import { toast } from "sonner";

import { revalidateTagName } from "@/actions/revalidate";

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
          await revalidateTagName("update-shipper");

          // The selector inside the delivery form runs its own react-query
          // cache, so revalidating the server tag alone never reaches it.
          // Invalidating is not enough either: like every search selector in
          // the app it sets refetchOnMount:false, and react-query only honours
          // that while the query still HOLDS data — shouldLoadOnMount fetches
          // whenever dataUpdatedAt is 0. So drop the data instead of marking
          // it stale: the next time the delivery form opens, the selector has
          // to fetch. Refetching here in the background would not work at all,
          // because an inactive refetch reuses the queryFn closure of the last
          // observer that fetched, and that closure rejects once unmounted.
          await queryClient.resetQueries(["shipper"]);
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
