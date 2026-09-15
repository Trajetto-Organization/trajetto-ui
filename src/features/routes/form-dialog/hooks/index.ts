"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { revalidateTagName } from "@/actions/revalidate";

import type { RouteFormState } from "../index";

interface UseRouteFormProps {
  state: RouteFormState;
  onClose: () => void;
  isEditing: boolean;
}

/**
 * Reacts to what the server action returned.
 *
 * `toastShownRef` is not optional: `useFormState` re-runs this effect on every
 * render that touches the state, and without the guard the success toast
 * fires twice for one save.
 */
function useRouteForm({ state, onClose, isEditing }: UseRouteFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef<boolean>(false);

  useEffect(() => {
    const errorMessage =
      (state?.createRouteError?.createRouteErrorMessage as string) ??
      (state?.updateRouteError?.updateRouteErrorMessage as string);

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;

      // A new route is empty, and a dispatcher who does not know that stares
      // at a board row reading "Sem paradas" wondering what went wrong. The
      // toast is where that is cheapest to say.
      toast.success(
        state.successMessage,
        isEditing
          ? undefined
          : {
              description:
                "Agora adicione as paradas em “Paradas e ordem”, no menu da rota.",
            },
      );

      const performRevalidation = async () => {
        try {
          await revalidateTagName("update-route");
        } catch (error) {
          toast.error("Erro ao atualizar dados. Recarregue a página.");
        }
      };

      void performRevalidation();
      onClose();
    }

    return () => {
      toastShownRef.current = false;
    };
  }, [state, onClose, isEditing]);

  return { formRef };
}

export { useRouteForm };
