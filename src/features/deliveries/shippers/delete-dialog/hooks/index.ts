import { useEffect, useRef } from "react";
import { useQueryClient } from "react-query";
import { toast } from "sonner";

import { revalidateTagName } from "@/actions/revalidate";

interface DeleteShipperFormState {
  successMessage?: string;
  deleteShipperError?: string;
}

function useDeleteShipperForm(
  state: DeleteShipperFormState | null,
  onClose: () => void,
) {
  const queryClient = useQueryClient();

  const toastShownRef = useRef(false);

  useEffect(() => {
    // The API refuses to delete a shipper that already carries history and
    // says how many deliveries hold it — that message is the whole point.
    if (state?.deleteShipperError) {
      toast.error(state.deleteShipperError, { duration: 8000 });
      return;
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success(state.successMessage);

      const performRevalidation = async () => {
        try {
          await revalidateTagName("update-shipper");

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
}

export { useDeleteShipperForm };
export type { DeleteShipperFormState };
